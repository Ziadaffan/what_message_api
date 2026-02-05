const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    socket.join(socket.user.id);

    try {
      await prisma.user.update({
        where: { id: socket.user.id },
        data: { isOnline: true, lastSeen: new Date() }
      });
    } catch (error) {
      console.error(`Error updating user online status: ${error.message}`);
    }

    const onlineUsers = await prisma.user.findMany({ where: { isOnline: true } });

    io.emit('get_online_users', onlineUsers);

    // Broadcast to all users that this user is online
    socket.broadcast.emit('user_online', socket.user.id);

    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, type = 'text', tempId } = data;

        const isBlocked = await prisma.block.findFirst({
          where: { blockerId: receiverId, blockedId: socket.user.id },
        });
        if (isBlocked) return socket.emit('error', { message: 'You are blocked by this user' });

        let chat = await prisma.chat.findFirst({
          where: {
            type: 'private',
            users: {
              every: { userId: { in: [socket.user.id, receiverId] } }
            }
          },
          include: { users: true },
        });

        if (!chat) {
          const receiver = await prisma.user.findUnique({ where: { id: receiverId } });

          if (!receiver) {
            return socket.emit('error', { message: 'Receiver not found' });
          }

          chat = await prisma.chat.create({
            data: {
              type: 'private',
              name: receiver.username,
              users: {
                create: [
                  { user: { connect: { id: socket.user.id } } },
                  { user: { connect: { id: receiverId } } },
                ]
              }
            },
            include: { users: true }
          });
        }

        const chatId = chat.id;

        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: socket.user.id,
            receiverId,
            content,
            type,
          },
        });

        const messagePayload = {
          id: message.id,
          senderId: socket.user.id,
          receiverId,
          chatId,
          content: message.content,
          createdAt: message.createdAt,
          Sender: {
            username: socket.user.username,
            avatar: socket.user.avatar,
          },
        };

        // Emit to receiver
        io.to(receiverId).emit('receive_message', messagePayload);

        // Emit back to sender for confirmation with tempId
        socket.emit('receive_message', {
          ...messagePayload,
          tempId  // Frontend uses this to map temp message to real message
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      io.to(receiverId).emit('typing_status', {
        senderId: socket.user.id,
        isTyping
      });
    });

    socket.on('friend_request_sent', (data) => {
      const { receiverId } = data;
      io.to(receiverId).emit('friend_request_received', socket.user);
    });

    socket.on('disconnect', async () => {
      try {
        await prisma.user.update({
          where: { id: socket.user.id },
          data: { lastSeen: new Date(), isOnline: false }
        });

        const onlineUsers = await prisma.user.findMany({ where: { isOnline: true } });
        io.emit('get_online_users', onlineUsers);

        // Broadcast to all users that this user is offline
        socket.broadcast.emit('user_offline', socket.user.id);

        console.log(`User disconnected: ${socket.user.username}`);
      } catch (error) {
        console.error(`Error handling disconnect for user ${socket.user.username}: ${error.message}`);
        // Ensure we don't crash even if database update fails
      }
    });
  });
};
