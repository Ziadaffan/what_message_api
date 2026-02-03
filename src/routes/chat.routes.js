const {protect} = require('../middlewares/auth.middleware');
const {getChats} = require('../controllers/chat.controller');

const router = require('express').Router();

router.get('/', protect, getChats);

module.exports = router;