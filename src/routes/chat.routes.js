const { protect } = require('../middlewares/auth.middleware');
const { getChats, createOrGetChat } = require('../controllers/chat.controller');

const router = require('express').Router();

router.get('/', protect, getChats);
router.post('/', protect, createOrGetChat);

module.exports = router;