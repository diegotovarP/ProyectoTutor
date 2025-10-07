const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  saveAttempts,
  getStudentAttempts,
  getStudentHistory,
  updateAttemptFeedback
} = require('../controllers/attempt.controller');

router.use(authenticate);

router.post('/', saveAttempts);
router.post('/submit', saveAttempts); 

router.get('/text/:textId/student/:studentId', getStudentAttempts);

router.get('/student/:studentId', getStudentHistory);

router.put('/:attemptId/feedback', updateAttemptFeedback);

module.exports = router;
