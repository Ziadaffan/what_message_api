const express = require('express');
const router = express.Router();
const { updateProfile, searchUsers } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

router.put('/profile', protect, updateProfile);
router.get('/search', protect, searchUsers);

module.exports = router;
