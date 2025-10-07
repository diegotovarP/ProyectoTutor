const express = require('express');
const controller = require('../controllers/text.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/topic/:topicId/recommendations', authenticate, controller.getRecommendations);
router.get('/topic/:topicId', authenticate, controller.getByTopic);
router.get('/:textId/reader', authenticate, controller.getReaderState);
router.post('/preview/:topicId', authenticate, authorize('teacher', 'admin'), controller.previewTextWithAI);
router.post('/save/:topicId', authenticate, authorize('teacher', 'admin'), controller.saveApprovedText);
router.post('/', authenticate, authorize('teacher', 'admin'), controller.createText);
router.patch('/:textId', authenticate, authorize('teacher', 'admin'), controller.updateText);
router.delete('/:textId', authenticate, authorize('teacher', 'admin'), controller.deleteText);
router.post('/:textId/regenerate', authenticate, authorize('teacher', 'admin'), controller.regenerateText);

module.exports = router;
