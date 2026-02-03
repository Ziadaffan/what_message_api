const express = require('express');
const router = express.Router();
const { getChatHistory, getNotifications, sendMessage } = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/history/:otherUserId', protect, getChatHistory);
router.get('/notifications', protect, getNotifications);
router.post('/', protect, sendMessage);

module.exports = router;
