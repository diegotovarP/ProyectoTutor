const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  tutorChat,
  tutorChatTest,
  getQuickSuggestions
} = require('../controllers/chatbot.controller');

router.use(authenticate);
router.post('/tutor', tutorChat);
router.post('/tutor-test', tutorChatTest);
router.post('/suggestions', getQuickSuggestions);

module.exports = router;
