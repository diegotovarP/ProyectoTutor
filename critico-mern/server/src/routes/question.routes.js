const express = require('express');
const controller = require('../controllers/question.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/text/:textId', authenticate, controller.getByText);
router.post('/text/:textId/submit', authenticate, controller.submitAnswers);
router.post('/preview/:textId', authenticate, authorize('teacher', 'admin'), controller.previewQuestionsWithAI);
router.post('/save/:textId', authenticate, authorize('teacher', 'admin'), controller.saveApprovedQuestions);
router.post('/', authenticate, authorize('teacher', 'admin'), controller.createQuestion);
router.patch('/:questionId', authenticate, authorize('teacher', 'admin'), controller.updateQuestion);
router.delete('/:questionId', authenticate, authorize('teacher', 'admin'), controller.deleteQuestion);
router.delete('/text/:textId', authenticate, authorize('teacher', 'admin'), controller.deleteAllQuestions);
router.post('/attempt/:attemptId/feedback', authenticate, controller.generateAutoFeedback);

module.exports = router;
