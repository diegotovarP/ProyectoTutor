const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Topic = require('../models/Topic');
const Text = require('../models/Text');
const QuestionAttempt = require('../models/QuestionAttempt');
const User = require('../models/User');


const getCourseStudents = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    const enrollments = await Enrollment.find({
      course: courseId,
      status: 'active'
    })
      .populate('student', 'firstName lastName email')
      .lean();

    const studentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const studentId = enrollment.student._id;

        const courseTopics = await Topic.find({ course: courseId }).select('_id').lean();
        const topicIds = courseTopics.map(t => t._id);

        const allTexts = await Text.find({ topic: { $in: topicIds } }).select('_id').lean();
        const totalTexts = allTexts.length;
        const textIds = allTexts.map(t => t._id);

        const textsWithAnswers = await QuestionAttempt.distinct('text', {
          student: studentId,
          text: { $in: textIds }
        });

        const answeredTextsCount = textsWithAnswers.length;
        const progress = totalTexts > 0
          ? Math.round((answeredTextsCount / totalTexts) * 100)
          : 0;

        return {
          ...enrollment.student,
          _id: enrollment.student._id,
          enrollmentId: enrollment._id,
          progress,
          enrolledAt: enrollment.createdAt
        };
      })
    );

    res.status(200).json({
      success: true,
      students: studentsWithProgress
    });
  } catch (error) {
    next(error);
  }
};


const getStudentTextsProgress = async (req, res, next) => {
  try {
    const { courseId, studentId } = req.params;

    const courseTopics = await Topic.find({ course: courseId }).lean();

    const allTexts = [];
    for (const topic of courseTopics) {
      const texts = await Text.find({ topic: topic._id }).lean();
      allTexts.push(...texts);
    }

    const textsWithStatus = await Promise.all(
      allTexts.map(async (text) => {
        const attempts = await QuestionAttempt.find({
          student: studentId,
          text: text._id
        }).lean();

        return {
          id: text._id,
          title: text.title,
          source: text.source,
          difficulty: text.difficulty,
          hasAnswered: attempts.length > 0,
          answeredCount: attempts.length
        };
      })
    );

    res.status(200).json({
      success: true,
      texts: textsWithStatus
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourseStudents,
  getStudentTextsProgress
};
