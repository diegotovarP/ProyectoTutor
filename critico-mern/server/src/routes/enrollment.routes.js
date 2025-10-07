const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  enrollStudent,
  getStudentEnrollments,
  getStudentProgress,
  checkEnrollment,
  updateLastAccess,
  unenrollStudent
} = require('../controllers/enrollment.controller');

router.use(authenticate);
router.post('/', enrollStudent);
router.get('/student/:studentId', getStudentEnrollments);
router.get('/student/:studentId/progress', getStudentProgress);
router.get('/check/:studentId/:courseId', checkEnrollment);
router.put('/:enrollmentId/access', updateLastAccess);
router.delete('/student/:studentId/course/:courseId', unenrollStudent);

module.exports = router;
