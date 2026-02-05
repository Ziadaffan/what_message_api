const prisma = require('../lib/db');

exports.sendRequest = async (req, res) => {
  try {
    const { receiver_id } = req.body;
    const senderId = req.user.id;
    const receiverId = receiver_id;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot invite yourself' });
    }

    // Check block (both directions)
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId }
        ]
      }
    });

    if (isBlocked) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    // Existing request or friendship
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ],
        status: { in: ['pending', 'accepted'] }
      }
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: 'Request already exists or already friends' });
    }

    const request = await prisma.friendRequest.create({
      data: { senderId, receiverId }
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'friend_request',
        title: 'New Friend Request',
        content: `${req.user.username} sent you a friend request`,
        metaData: { senderId }
      }
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.respondToRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const request_id = req.params.id;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const request = await prisma.friendRequest.findUnique({
      where: { id: request_id },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            isOnline: true
          }
        }
      }
    });

    if (!request || request.receiverId !== req.user.id) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const updated = await prisma.friendRequest.update({
      where: { id: request_id },
      data: { status }
    });

    if (status === 'accepted') {
      // Create notification
      await prisma.notification.create({
        data: {
          userId: request.senderId,
          type: 'system',
          title: 'Request Accepted',
          content: `${req.user.username} accepted your friend request`,
          metaData: { userId: req.user.id }
        }
      });

      // Create chat for the new friends
      const chat = await prisma.chat.create({
        data: {
          type: 'private',
          name: null,
          users: {
            create: [
              { user: { connect: { id: request.senderId } } },
              { user: { connect: { id: req.user.id } } }
            ]
          }
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatar: true,
                  isOnline: true
                }
              }
            }
          }
        }
      });

      // Prepare chat data for both users
      const chatForSender = {
        id: chat.id,
        friendId: req.user.id,
        friend: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          avatar: req.user.avatar,
          isOnline: req.user.isOnline
        },
        lastMessage: null,
        createdAt: chat.createdAt
      };

      const chatForReceiver = {
        id: chat.id,
        friendId: request.sender.id,
        friend: {
          id: request.sender.id,
          username: request.sender.username,
          email: request.sender.email,
          avatar: request.sender.avatar,
          isOnline: request.sender.isOnline
        },
        lastMessage: null,
        createdAt: chat.createdAt
      };

      // Emit new_chat event to both users
      const socketHelper = require('../lib/socket');
      const io = socketHelper.getIO();

      io.to(request.senderId).emit('new_chat', chatForSender);
      io.to(req.user.id).emit('new_chat', chatForReceiver);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await prisma.friendRequest.findMany({
      where: {
        status: 'accepted',
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            status: true,
            isOnline: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            status: true,
            isOnline: true
          }
        }
      }
    });

    const friends = friendships.map(f =>
      f.senderId === userId ? f.receiver : f.sender
    );

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: req.user.id, status: 'pending' },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, status: true }
        }
      }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
