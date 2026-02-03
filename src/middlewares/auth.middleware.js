const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, avatar: true, status: true, lastSeen: true }
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Token is invalid, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
