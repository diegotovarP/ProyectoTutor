const express = require('express');
const controller = require('../controllers/progress.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/student/:studentId', authenticate, authorize('teacher', 'admin'), controller.getStudentProgress);
router.get('/course/:courseId/metrics', authenticate, authorize('teacher', 'admin'), controller.getCourseMetrics);

module.exports = router;
