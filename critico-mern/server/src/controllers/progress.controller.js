const mongoose = require('mongoose');
const Enrollment = require('../models/Enrollment');
const ReadingProgress = require('../models/ReadingProgress');
const QuestionAttempt = require('../models/QuestionAttempt');

const getStudentProgress = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const enrollments = await Enrollment.find({ student: studentId })
      .populate('course', 'title')
      .lean();

    const textProgress = await ReadingProgress.find({ student: studentId, text: { $exists: true } })
      .populate('text', 'title topic')
      .lean();

    res.status(200).json({
      enrollments: enrollments.map((enrollment) => ({
        courseId: enrollment.course?._id,
        courseTitle: enrollment.course?.title,
        progress: enrollment.progress
      })),
      texts: textProgress.map((item) => ({
        textId: item.text?._id,
        title: item.text?.title,
        completed: item.completed,
        score: item.score,
        lastPosition: item.lastPosition,
        updatedAt: item.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

const getCourseMetrics = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const enrollmentMetrics = await Enrollment.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: '$course',
          averageCompletion: { $avg: '$progress.completion' },
          levelDistribution: {
            $push: '$progress.level'
          }
        }
      }
    ]);

    const scores = await QuestionAttempt.aggregate([
      { $match: { text: { $exists: true } } },
      {
        $group: {
          _id: '$text',
          averageScore: { $avg: '$score' },
          attempts: { $sum: 1 }
        }
      },
      { $limit: 50 }
    ]);

    res.status(200).json({
      courseId,
      enrollmentMetrics: enrollmentMetrics[0] || null,
      questionMetrics: scores
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentProgress,
  getCourseMetrics
};
