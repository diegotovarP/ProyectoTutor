const express = require('express');
const controller = require('../controllers/topic.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/course/:courseId', authenticate, controller.getByCourse);
router.post('/course/:courseId', authenticate, authorize('teacher', 'admin'), controller.createTopic);
router.patch('/:topicId', authenticate, authorize('teacher', 'admin'), controller.updateTopic);
router.delete('/:topicId', authenticate, authorize('teacher', 'admin'), controller.deleteTopic);

module.exports = router;
