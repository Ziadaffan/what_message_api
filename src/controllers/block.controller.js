const prisma = require('../lib/db');


exports.blockUser = async (req, res) => {
  try {
    const { userIdToBlock } = req.body;
    const blockerId = req.user.id;

    if (blockerId === userIdToBlock) {
      return res.status(400).json({ message: "You can't block yourself" });
    }

    const alreadyBlocked = await prisma.block.findFirst({
      where: {
        blockerId,
        blockedId: userIdToBlock
      }
    });

    if (alreadyBlocked) {
      return res.status(400).json({ message: 'Already blocked' });
    }

    await prisma.block.create({
      data: {
        blockerId,
        blockedId: userIdToBlock
      }
    });

    // Remove friend requests both directions
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: blockerId, receiverId: userIdToBlock },
          { senderId: userIdToBlock, receiverId: blockerId }
        ]
      }
    });

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.unblockUser = async (req, res) => {
  try {
    const { userIdToUnblock } = req.body;

    await prisma.block.deleteMany({
      where: {
        blockerId: req.user.id,
        blockedId: userIdToUnblock
      }
    });

    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

