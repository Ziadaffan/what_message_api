const prisma = require('../lib/db');

exports.updateProfile = async (req, res) => {
  try {
    const { username, avatar, status } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (user) {
      user.username = username || user.username;
      user.avatar = avatar || user.avatar;
      user.status = status || user.status;

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const users = await prisma.user.findMany({
      where: {
        username: { contains: q },
        id: { not: req.user.id }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
        lastSeen: true
      }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
