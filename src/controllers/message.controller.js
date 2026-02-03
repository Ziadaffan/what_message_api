const prisma = require('../lib/db');

exports.getChatHistory = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          sender: {
            select: {
              username: true,
              avatar: true
            }
          }
        }
      }),

      prisma.message.count({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
          ]
        }
      })
    ]);

    res.json({
      messages: messages.reverse(),
      total,
      limit,
      offset
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.sendMessage = async (req, res) => {
    try {
        const { receiver_id, content } = req.body;
      
        const message = await prisma.message.create({
            data: {
                senderId: req.user.id,
                receiverId: receiver_id,
                content
            }
        });

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

