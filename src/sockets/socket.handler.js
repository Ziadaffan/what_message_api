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
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    socket.join(socket.user.id);

    await prisma.user.update({
      where: { id: socket.user.id },
      data: { isOnline: true, lastSeen: new Date() }
    });

    const onlineUsers = await prisma.user.findMany({ where: { isOnline: true } });

    io.emit('get_online_users', onlineUsers);

    socket.on('send_message', async (data) => {
      const { receiverId, content, type = 'text' } = data;

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

      const messageWithSender = {
        ...message,
        Sender: {
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
      };

      io.to(receiverId).emit('receive_message', messageWithSender);
    });

    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      io.to(receiverId).emit('display_typing', {
        senderId: socket.user.id,
        isTyping
      });
    });

    socket.on('mark_read', async (data) => {
      const { chatId, receiverId } = data;

      await prisma.message.updateMany({
        where: {
          chatId,
          receiverId: socket.user.id,
          isRead: false
        },
        data: { isRead: true }
      });



      io.to(receiverId).emit('message_read', { chatId, readerId: socket.user.id });
    });

    socket.on('disconnect', async () => {
      await prisma.user.update({
        where: { id: socket.user.id },
        data: { lastSeen: new Date(), isOnline: false }
      });

      const onlineUsers = await prisma.user.findMany({ where: { isOnline: true } });
      io.emit('get_online_users', onlineUsers);
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });
};
