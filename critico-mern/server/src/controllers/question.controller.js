const createError = require('http-errors');
const Question = require('../models/Question');
const QuestionAttempt = require('../models/QuestionAttempt');

const getByText = async (req, res, next) => {
  try {
    const { textId } = req.params;
    const questions = await Question.find({ text: textId }).lean();
    res.status(200).json(questions.map((question) => ({
      id: question._id,
      skill: question.skill,
      type: question.type,
      prompt: question.prompt,
      options: question.options
    })));
  } catch (error) {
    next(error);
  }
};

const submitAnswers = async (req, res, next) => {
  try {
    const { textId } = req.params;
    const { responses } = req.body;
    if (!Array.isArray(responses) || !responses.length) {
      throw createError(422, 'Respuestas requeridas');
    }

    const questions = await Question.find({ _id: { $in: responses.map((r) => r.questionId) } }).lean();
    const questionMap = questions.reduce((acc, question) => {
      acc[question._id.toString()] = question;
      return acc;
    }, {});

    let totalScore = 0;
    const attempts = responses.map((response) => {
      const question = questionMap[response.questionId];
      if (!question) return null;
      let score = 0;
      if (question.type === 'multiple-choice') {
        const option = question.options.find((opt) => opt.label === response.answer);
        score = option?.isCorrect ? 1 : 0;
      } else {
        score = response.score || 0;
      }
      totalScore += score;
      return {
        student: req.user._id,
        question: question._id,
        text: textId,
        answers: [{ value: response.answer, isCorrect: Boolean(score) }],
        score,
        timeSpentSeconds: response.timeSpentSeconds || 0,
        autoFeedback: question.feedbackTemplate || ''
      };
    }).filter(Boolean);

    await QuestionAttempt.insertMany(attempts);

    res.status(201).json({
      totalScore,
      maxScore: questions.length,
      feedback: attempts.map((attempt) => ({
        questionId: attempt.question,
        autoFeedback: attempt.autoFeedback
      }))
    });
  } catch (error) {
    next(error);
  }
};

const previewQuestionsWithAI = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden generar preguntas con IA' });
    }

    const { textId } = req.params;
    const { correcciones } = req.body;

    const Text = require('../models/Text');
    const text = await Text.findById(textId);
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }

    const coraService = require('../services/cora.service');
    const coraResponse = await coraService.generateQuestions({
      textContent: text.content,
      textTitle: text.title,
      nivel: text.difficulty,
      correcciones: correcciones || ''
    });

    const generatedContent = coraResponse.choices[0].message.content;

    const questions = parseGeneratedQuestions(generatedContent);

    res.status(200).json({
      success: true,
      preview: true,
      questions,
      rawContent: generatedContent
    });
  } catch (error) {
    if (error.message.includes('CORA')) {
      return res.status(503).json({ 
        message: 'Error al comunicarse con el servicio de IA', 
        detail: error.message 
      });
    }
    next(error);
  }
};

const saveApprovedQuestions = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden guardar preguntas' });
    }

    const { textId } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar al menos una pregunta' });
    }

    const Text = require('../models/Text');
    const text = await Text.findById(textId);
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }

    const savedQuestions = await Promise.all(
      questions.map(q => Question.create({
        text: textId,
        skill: mapTypeToSkill(q.type),
        type: 'open-ended', 
        prompt: q.question,
        feedbackTemplate: q.explanation || ''
      }))
    );

    res.status(201).json({
      success: true,
      message: 'Preguntas guardadas exitosamente',
      questions: savedQuestions.map(q => ({
        id: q._id,
        skill: q.skill,
        type: q.type,
        prompt: q.prompt
      }))
    });
  } catch (error) {
    next(error);
  }
};

function parseGeneratedQuestions(content) {
  const questions = [];
  const lines = content.split('\n');
  
  let currentQuestion = {};
  
  for (let line of lines) {
    line = line.trim();
    
    if (line.startsWith('Pregunta ')) {
      if (currentQuestion.question) {
        questions.push(currentQuestion);
      }
      currentQuestion = {};
    } else if (line.startsWith('Tipo:')) {
      currentQuestion.type = line.replace('Tipo:', '').trim();
    } else if (line.startsWith('Pregunta:')) {
      currentQuestion.question = line.replace('Pregunta:', '').trim();
    } else if (line.startsWith('Explicación:') || line.startsWith('Explicacion:')) {
      currentQuestion.explanation = line.replace(/Explicaci[oó]n:/, '').trim();
    }
  }
  
  if (currentQuestion.question) {
    questions.push(currentQuestion);
  }
  
  return questions;
}

function mapTypeToSkill(type) {
  const mapping = {
    'literal': 'literal',
    'inferencia': 'inferencial',
    'inferencial': 'inferencial',
    'crítica': 'crítica',
    'critica': 'crítica',
    'aplicación': 'aplicación',
    'aplicacion': 'aplicación'
  };
  return mapping[type.toLowerCase()] || 'literal';
}

async function deleteAllQuestions(req, res) {
  try {
    const { textId } = req.params;
    
    const result = await Question.deleteMany({ text: textId });
    
    res.json({ 
      message: 'Preguntas eliminadas exitosamente',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error al eliminar preguntas:', err);
    res.status(500).json({ message: 'Error al eliminar las preguntas' });
  }
}

async function deleteQuestion(req, res, next) {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden eliminar preguntas' });
    }

    const { questionId } = req.params;
    
    const question = await Question.findByIdAndDelete(questionId);
    
    if (!question) {
      return res.status(404).json({ message: 'Pregunta no encontrada' });
    }
    
    res.json({ 
      success: true,
      message: 'Pregunta eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
}

async function updateQuestion(req, res, next) {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden actualizar preguntas' });
    }

    const { questionId } = req.params;
    const { prompt, type, skill, options, feedbackTemplate } = req.body;

    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ message: 'Pregunta no encontrada' });
    }

    if (prompt !== undefined) question.prompt = prompt;
    if (type !== undefined) question.type = type;
    if (skill !== undefined) question.skill = skill;
    if (options !== undefined) question.options = options;
    if (feedbackTemplate !== undefined) question.feedbackTemplate = feedbackTemplate;

    await question.save();

    res.status(200).json({
      success: true,
      message: 'Pregunta actualizada exitosamente',
      question: {
        id: question._id,
        prompt: question.prompt,
        type: question.type,
        skill: question.skill,
        options: question.options
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createQuestion(req, res, next) {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden crear preguntas' });
    }

    const { text, prompt, type, skill, options, feedbackTemplate } = req.body;

    if (!text || !prompt) {
      return res.status(400).json({ message: 'El texto y la pregunta son obligatorios' });
    }

    const question = await Question.create({
      text,
      prompt,
      type: type || 'open-ended',
      skill: skill || 'literal',
      options: options || [],
      feedbackTemplate: feedbackTemplate || ''
    });

    res.status(201).json({
      success: true,
      message: 'Pregunta creada exitosamente',
      question: {
        id: question._id,
        prompt: question.prompt,
        type: question.type,
        skill: question.skill,
        options: question.options
      }
    });
  } catch (error) {
    next(error);
  }
}

async function generateAutoFeedback(req, res, next) {
  try {
    const { attemptId } = req.params;
    
    const attempt = await QuestionAttempt.findById(attemptId)
      .populate('question')
      .populate('text');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Respuesta no encontrada' });
    }

    const isOwner = attempt.student.toString() === req.user._id.toString();
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';
    
    if (!isOwner && !isTeacher) {
      return res.status(403).json({ message: 'No tienes permiso para acceder a esta respuesta' });
    }

    const Text = require('../models/Text');
    const text = await Text.findById(attempt.text);

    // 1. Analizar sesgos en la respuesta del estudiante
    const biasService = require('../services/bias.service');
    const biasAnalysis = await biasService.analyzeStudentAnswer(
      attempt.answers[0]?.value || '',
      {
        pregunta: attempt.question.prompt || '',
        tipo: attempt.question.skill || 'literal',
        explicacion: attempt.question.hint || ''
      },
      text?.content || ''
    );

    // 2. Generar feedback con IA incluyendo información de sesgos
    const coraService = require('../services/cora.service');
    const feedbackResponse = await coraService.generateFeedback({
      pregunta: attempt.question.prompt,
      respuesta: attempt.answers[0]?.value || '',
      tema: text?.title || 'Sin tema',
      skill: attempt.question.skill,
      textoContexto: text?.content || '',
      // ✅ NUEVO: Incluir análisis de sesgos
      sesgosDetectados: biasAnalysis.biases,
      puntuacion: biasAnalysis.score,
      nivelCalidad: biasAnalysis.nivel,
      recomendaciones: biasAnalysis.recomendaciones
    });

    const generatedFeedback = feedbackResponse.choices[0].message.content;
    attempt.autoFeedback = generatedFeedback;
    attempt.feedbackGeneratedAt = new Date();
    
    // ✅ Guardar análisis de sesgos en el attempt
    attempt.biasAnalysis = {
      score: biasAnalysis.score,
      maxScore: biasAnalysis.maxScore,
      nivel: biasAnalysis.nivel,
      biasesDetected: biasAnalysis.biases.length,
      analyzedAt: new Date()
    };
    
    await attempt.save();

    res.status(200).json({
      success: true,
      feedback: generatedFeedback,
      attemptId: attempt._id
    });

  } catch (error) {
    if (error.message.includes('CORA')) {
      return res.status(503).json({ 
        message: 'Error al comunicarse con el servicio de IA', 
        detail: error.message 
      });
    }
    next(error);
  }
}

module.exports = {
  getByText,
  submitAnswers,
  previewQuestionsWithAI,
  saveApprovedQuestions,
  deleteAllQuestions,
  deleteQuestion,
  updateQuestion,
  createQuestion,
  generateAutoFeedback
};
