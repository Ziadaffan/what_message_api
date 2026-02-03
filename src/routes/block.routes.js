const express = require('express');
const router = express.Router();
const { blockUser, unblockUser } = require('../controllers/block.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/block', protect, blockUser);
router.post('/unblock', protect, unblockUser);

module.exports = router;
