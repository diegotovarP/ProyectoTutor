const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const ReadingProgress = require('../models/ReadingProgress');
const QuestionAttempt = require('../models/QuestionAttempt');
const Text = require('../models/Text');
const Topic = require('../models/Topic');

const enrollStudent = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Ya estás matriculado en este curso' });
    }

    const enrollment = new Enrollment({
      student: studentId,
      course: courseId,
      status: 'active',
      progress: {
        completion: 0,
        level: 'incipiente',
        lastAccessAt: new Date()
      }
    });

    await enrollment.save();

    res.status(201).json({
      success: true,
      message: 'Matrícula exitosa',
      enrollment
    });
  } catch (error) {
    next(error);
  }
};

const getStudentEnrollments = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'active'
    })
      .populate('course', 'title description instructor createdAt')
      .lean();

    res.status(200).json({
      success: true,
      enrollments
    });
  } catch (error) {
    next(error);
  }
};

const getStudentProgress = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'active'
    })
      .populate('course')
      .lean();

    const progressData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseId = enrollment.course._id;

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

        const answeredQuestions = await QuestionAttempt.countDocuments({
          student: studentId,
          text: { $in: textIds }
        });

        const completionPercentage = totalTexts > 0
          ? Math.round((answeredTextsCount / totalTexts) * 100)
          : 0;

        return {
          courseId: enrollment.course._id,
          courseTitle: enrollment.course.title,
          courseDescription: enrollment.course.description,
          completion: completionPercentage,
          level: enrollment.progress.level,
          completedTexts: answeredTextsCount,
          totalTexts: totalTexts,
          answeredQuestions,
          lastAccessAt: enrollment.progress.lastAccessAt,
          enrolledAt: enrollment.createdAt
        };
      })
    );

    res.status(200).json({
      success: true,
      progress: progressData
    });
  } catch (error) {
    next(error);
  }
};


const checkEnrollment = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'active'
    });

    res.status(200).json({
      success: true,
      isEnrolled: !!enrollment,
      enrollment: enrollment || null
    });
  } catch (error) {
    next(error);
  }
};


const updateLastAccess = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findByIdAndUpdate(
      enrollmentId,
      {
        'progress.lastAccessAt': new Date()
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ message: 'Matrícula no encontrada' });
    }

    res.status(200).json({
      success: true,
      enrollment
    });
  } catch (error) {
    next(error);
  }
};


const unenrollStudent = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;

    const enrollment = await Enrollment.findOneAndDelete({
      student: studentId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'No estás matriculado en este curso' });
    }

    res.status(200).json({
      success: true,
      message: 'Te has des-matriculado exitosamente del curso'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrollStudent,
  getStudentEnrollments,
  getStudentProgress,
  checkEnrollment,
  updateLastAccess,
  unenrollStudent
};
