const express = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const topicRoutes = require('./topic.routes');
const textRoutes = require('./text.routes');
const questionRoutes = require('./question.routes');
const biasRoutes = require('./bias.routes');
const progressRoutes = require('./progress.routes');
const adminRoutes = require('./admin.routes');
const enrollmentRoutes = require('./enrollment.routes');
const attemptRoutes = require('./attempt.routes');
const chatbotRoutes = require('./chatbot.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/topics', topicRoutes);
router.use('/texts', textRoutes);
router.use('/questions', questionRoutes);
router.use('/bias', biasRoutes);
router.use('/progress', progressRoutes);
router.use('/admin', adminRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/attempts', attemptRoutes);
router.use('/chatbot', chatbotRoutes);

module.exports = router;
