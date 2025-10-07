const express = require('express');
const controller = require('../controllers/course.controller');
const studentsController = require('../controllers/students.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/available', authenticate, authorize('student'), controller.getAvailableCourses);
router.get('/enrolled', authenticate, authorize('student'), controller.getEnrolledCourses);

router.get('/:courseId/students', authenticate, authorize('teacher', 'admin'), studentsController.getCourseStudents);
router.get('/:courseId/student/:studentId/texts-progress', authenticate, authorize('teacher', 'admin'), studentsController.getStudentTextsProgress);

router.get('/mine', authenticate, controller.getMyCourses);
router.get('/:courseId', authenticate, controller.getCourseById);
router.post('/', authenticate, authorize('teacher', 'admin'), controller.createCourse);
router.patch('/:courseId', authenticate, authorize('teacher', 'admin'), controller.updateCourse);
router.delete('/:courseId', authenticate, authorize('teacher', 'admin'), controller.deleteCourse);

module.exports = router;
