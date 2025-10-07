const QuestionAttempt = require('../models/QuestionAttempt');
const Question = require('../models/Question');
const Text = require('../models/Text');
const ReadingProgress = require('../models/ReadingProgress');


const saveAttempts = async (req, res, next) => {
  try {
    const { studentId, textId, answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Debes proporcionar respuestas' });
    }

    const text = await Text.findById(textId);
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }

    const savedAttempts = [];

    for (const answer of answers) {
      const { questionId, answer: studentAnswer, timeSpentSeconds } = answer;

      const question = await Question.findById(questionId);
      if (!question) {
        continue; 
      }

      let attempt = await QuestionAttempt.findOne({
        student: studentId,
        question: questionId,
        text: textId
      });

      if (attempt) {
        console.log(`🔄 Actualizando attempt existente ID: ${attempt._id}`);
        console.log(`   Respuesta anterior: "${attempt.answers?.[0]?.value}"`);
        console.log(`   Nueva respuesta: "${studentAnswer}"`);
        
        attempt.answers = [{
          value: studentAnswer,
          isCorrect: null
        }];
        attempt.timeSpentSeconds = timeSpentSeconds || 0;
        attempt.completedAt = new Date();
        attempt.requiresReview = true;
        
        attempt.autoFeedback = undefined;
        attempt.feedback = undefined;
        attempt.feedbackGeneratedAt = undefined;
        
        await attempt.save();
        console.log(`✅ Attempt actualizado exitosamente para pregunta ${questionId}`);
        console.log(`   Respuesta guardada: "${attempt.answers?.[0]?.value}"`);
      } else {
        attempt = new QuestionAttempt({
          student: studentId,
          question: questionId,
          text: textId,
          answers: [{
            value: studentAnswer,
            isCorrect: null 
          }],
          timeSpentSeconds: timeSpentSeconds || 0,
          completedAt: new Date(),
          requiresReview: true 
        });

        await attempt.save();
        console.log(`✅ Nuevo attempt creado para pregunta ${questionId}`);
      }

      savedAttempts.push(attempt);
    }

    await ReadingProgress.findOneAndUpdate(
      { student: studentId, text: textId },
      {
        completed: true,
        resumedAt: new Date()
      },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: savedAttempts.length === 1 
        ? 'Respuesta guardada exitosamente' 
        : 'Respuestas guardadas exitosamente',
      attempts: savedAttempts,
      totalSaved: savedAttempts.length,
      isUpdate: savedAttempts.some(a => a.updatedAt && a.updatedAt > a.createdAt)
    });
  } catch (error) {
    next(error);
  }
};

const getStudentAttempts = async (req, res, next) => {
  try {
    const { textId, studentId } = req.params;

    const allAttempts = await QuestionAttempt.find({
      student: studentId,
      text: textId
    })
      .populate('question', 'prompt type skill feedbackTemplate')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const uniqueAttempts = [];
    const seenQuestions = new Set();

    for (const attempt of allAttempts) {
      const questionId = attempt.question?._id?.toString() || attempt.question?.toString();
      
      if (!seenQuestions.has(questionId)) {
        seenQuestions.add(questionId);
        uniqueAttempts.push(attempt);
        console.log(`📝 Attempt más reciente para pregunta ${questionId}:`, {
          answer: attempt.answers?.[0]?.value?.substring(0, 50) + '...',
          updatedAt: attempt.updatedAt,
          createdAt: attempt.createdAt
        });
      }
    }

    console.log(`✅ Devolviendo ${uniqueAttempts.length} attempts únicos de ${allAttempts.length} totales`);

    res.status(200).json({
      success: true,
      attempts: uniqueAttempts,
      hasAttempts: uniqueAttempts.length > 0
    });
  } catch (error) {
    next(error);
  }
};


const getStudentHistory = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const attempts = await QuestionAttempt.find({ student: studentId })
      .populate('question', 'prompt type skill')
      .populate('text', 'title')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      attempts,
      total: attempts.length
    });
  } catch (error) {
    next(error);
  }
};


const updateAttemptFeedback = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { score, autoFeedback, feedback, isCorrect } = req.body;

    const attempt = await QuestionAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Intento no encontrado' });
    }

    if (score !== undefined) attempt.score = score;
    if (autoFeedback) attempt.autoFeedback = autoFeedback;
    if (feedback !== undefined) attempt.feedback = feedback; 
    if (isCorrect !== undefined && attempt.answers.length > 0) {
      attempt.answers[0].isCorrect = isCorrect;
    }
    if (feedback || autoFeedback) {
      attempt.requiresReview = false;
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Retroalimentación actualizada',
      attempt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveAttempts,
  getStudentAttempts,
  getStudentHistory,
  updateAttemptFeedback
};
