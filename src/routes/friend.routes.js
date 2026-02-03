const express = require('express');
const router = express.Router();
const { sendRequest, respondToRequest, getFriends, getRequests } = require('../controllers/friend.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/invite', protect, sendRequest);
router.get('/', protect, getFriends);
router.get('/requests', protect, getRequests);
router.put('/respond/:id', protect, respondToRequest);

module.exports = router;
