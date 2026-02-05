const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const friendRoutes = require('./routes/friend.routes');
const messageRoutes = require('./routes/message.routes');
const blockRoutes = require('./routes/block.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/chats', chatRoutes);

// Socket Helper
const socketHelper = require('./lib/socket');
socketHelper.init(io);

// Socket Handler
require('./sockets/socket.handler')(io);

// Basic error handler
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

module.exports = { server, io };
