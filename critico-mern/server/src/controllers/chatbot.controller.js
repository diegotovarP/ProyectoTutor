const coraService = require('../services/cora.service');
const Enrollment = require('../models/Enrollment');
const QuestionAttempt = require('../models/QuestionAttempt');
const Text = require('../models/Text');
const Topic = require('../models/Topic');

const tutorChat = async (req, res, next) => {
  try {
    console.log('🔵 === CHATBOT ENDPOINT LLAMADO ===');
    console.log('Body recibido:', JSON.stringify(req.body, null, 2));
    
    const { message, studentName, studentId, currentText, currentCourse, conversationHistory } = req.body;

    if (!message || !message.trim()) {
      console.log('❌ Mensaje vacío');
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }
    
    console.log('✅ Mensaje válido recibido:', message);

    let progressData = null;
    if (studentId) {
      try {
        console.log('📊 Obteniendo progreso detallado del estudiante:', studentId);

        const enrollments = await Enrollment.find({
          student: studentId,
          status: 'active'
        })
          .populate('course')
          .lean();

        const coursesProgress = await Promise.all(
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

            const attempts = await QuestionAttempt.find({
              student: studentId,
              text: { $in: textIds },
              score: { $exists: true }
            }).select('score').lean();

            const avgScore = attempts.length > 0
              ? (attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length).toFixed(1)
              : 0;

            const completionPercentage = totalTexts > 0
              ? Math.round((answeredTextsCount / totalTexts) * 100)
              : 0;

            return {
              courseTitle: enrollment.course.title,
              completion: completionPercentage,
              level: enrollment.progress.level,
              completedTexts: answeredTextsCount,
              totalTexts: totalTexts,
              answeredQuestions,
              averageScore: avgScore,
              lastAccessAt: enrollment.progress.lastAccessAt
            };
          })
        );

        const totalTextsCompleted = coursesProgress.reduce((sum, c) => sum + c.completedTexts, 0);
        const totalTextsAvailable = coursesProgress.reduce((sum, c) => sum + c.totalTexts, 0);
        const totalQuestionsAnswered = coursesProgress.reduce((sum, c) => sum + c.answeredQuestions, 0);
        
        const allScores = coursesProgress.filter(c => c.averageScore > 0).map(c => parseFloat(c.averageScore));
        const globalAverageScore = allScores.length > 0
          ? (allScores.reduce((sum, s) => sum + s, 0) / allScores.length).toFixed(1)
          : 0;

        progressData = {
          courses: coursesProgress,
          summary: {
            totalCourses: enrollments.length,
            totalTextsCompleted,
            totalTextsAvailable,
            totalQuestionsAnswered,
            globalAverageScore
          }
        };

        console.log('✅ Progreso detallado obtenido:', {
          cursos: progressData.courses.length,
          textosCompletados: progressData.summary.totalTextsCompleted,
          promedioGlobal: progressData.summary.globalAverageScore
        });
      } catch (progressError) {
        console.warn('⚠️ Error obteniendo progreso:', progressError.message);
      }
    }

    let contextInfo = `Eres un tutor personal amigable y experto en educación. Tu nombre es "Tutor IA".
Tu rol es ayudar a ${studentName || 'el estudiante'} a aprender y comprender mejor los conceptos.

PERSONALIDAD:
- Amigable, paciente y motivador
- Explicas con claridad usando ejemplos
- Das feedback constructivo
- Usas emojis ocasionalmente para ser más cercano
- Haces preguntas para verificar comprensión

CAPACIDADES:
1. Explicar conceptos complejos de forma simple
2. Dar ejemplos prácticos y ejercicios
3. Ayudar a responder preguntas de comprensión
4. Motivar y dar seguimiento al progreso
5. Resumir contenidos
6. Relacionar conceptos con la vida real

`;

    if (currentText) {
      contextInfo += `\nCONTEXTO ACTUAL:
El estudiante está leyendo: "${currentText.title}"
Nivel de dificultad: ${currentText.difficulty || 'intermedio'}
Contenido del texto:
${currentText.content ? currentText.content.substring(0, 1500) : 'No disponible'}

`;
    }

    if (currentCourse) {
      contextInfo += `\nCURSO ACTUAL: ${currentCourse.title}
Descripción: ${currentCourse.description || ''}

`;
    }

    if (progressData) {
      contextInfo += `\n📊 PROGRESO DETALLADO DEL ESTUDIANTE:

RESUMEN GENERAL:
- Cursos inscritos: ${progressData.summary.totalCourses}
- Textos completados: ${progressData.summary.totalTextsCompleted} de ${progressData.summary.totalTextsAvailable} (${progressData.summary.totalTextsAvailable > 0 ? Math.round((progressData.summary.totalTextsCompleted / progressData.summary.totalTextsAvailable) * 100) : 0}%)
- Preguntas respondidas: ${progressData.summary.totalQuestionsAnswered}
- Promedio general: ${progressData.summary.globalAverageScore}%

PROGRESO POR CURSO:
`;
      
      progressData.courses.forEach((course, index) => {
        contextInfo += `
${index + 1}. ${course.courseTitle}
   - Completado: ${course.completion}% (${course.completedTexts}/${course.totalTexts} textos)
   - Nivel actual: ${course.level}
   - Preguntas respondidas: ${course.answeredQuestions}
   - Promedio de calificaciones: ${course.averageScore}%
   - Último acceso: ${course.lastAccessAt ? new Date(course.lastAccessAt).toLocaleDateString('es-ES') : 'N/A'}
`;
      });

      contextInfo += `\n`;
    }

    if (conversationHistory && conversationHistory.length > 0) {
      contextInfo += `\nCONVERSACIÓN PREVIA:
`;
      conversationHistory.forEach((exchange, idx) => {
        contextInfo += `${studentName}: ${exchange.user}\n`;
        contextInfo += `Tutor: ${exchange.bot}\n`;
      });
    }

    contextInfo += `\nPREGUNTA ACTUAL DEL ESTUDIANTE:
${message}

INSTRUCCIONES DE RESPUESTA:
- Responde de forma clara y concisa (máximo 300 palabras)
- Si es sobre el texto actual, usa ese contexto
- Da ejemplos cuando sea posible
- Si piden ayuda con preguntas, guíalos sin dar la respuesta directa
- Si piden motivación, sé positivo y da consejos prácticos
- Si piden explicación, hazla paso a paso
- Si piden resumen, estructura con puntos clave
- Termina preguntando si necesitan más aclaración

RESPONDE AHORA:`;

    console.log('🤖 Procesando consulta del tutor para:', studentName);
    console.log('📝 Mensaje:', message);
    console.log('📚 Contexto del texto:', currentText?.title || 'Ninguno');
    console.log('📖 Contexto del curso:', currentCourse?.title || 'Ninguno');
    
    console.log('🔄 Llamando a CORA...');

    let coraResponse;
    try {
      coraResponse = await coraService.generateTutorResponse({
        prompt: contextInfo,
        message: message,
        maxTokens: 800
      });
      console.log('✅ CORA respondió exitosamente');
    } catch (coraError) {
      console.error('❌ Error al llamar a CORA:', coraError.message);
      throw coraError;
    }

    if (!coraResponse || !coraResponse.choices || !coraResponse.choices[0]) {
      console.error('❌ Respuesta de CORA inválida:', coraResponse);
      throw new Error('Respuesta del servicio de IA no válida');
    }

    const botResponse = coraResponse.choices[0].message.content.trim();

    console.log('✅ Respuesta generada exitosamente');
    console.log('📤 Respuesta (primeros 100 chars):', botResponse.substring(0, 100));

    res.status(200).json({
      success: true,
      response: botResponse,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Error en chatbot tutor:', error);
    
    if (error.message && error.message.includes('CORA')) {
      return res.status(503).json({
        error: 'El servicio de tutoría no está disponible temporalmente',
        message: 'Lo siento, estoy teniendo problemas técnicos. Por favor, intenta de nuevo en unos momentos.'
      });
    }
    
    next(error);
  }
};

const tutorChatTest = async (req, res, next) => {
  try {
    console.log('🧪 === TEST ENDPOINT LLAMADO ===');
    const { message, studentName, currentText } = req.body;
    
    const testResponse = `¡Hola ${studentName || 'estudiante'}! 👋

Recibí tu mensaje: "${message}"

${currentText ? `Veo que estás leyendo: "${currentText.title}"` : 'No hay texto en contexto'}

Esta es una respuesta de PRUEBA. Si ves esto, la comunicación frontend-backend funciona correctamente. ✅

Ahora necesitamos verificar la conexión con CORA para obtener respuestas inteligentes.`;

    console.log('✅ Enviando respuesta de prueba');
    
    res.status(200).json({
      success: true,
      response: testResponse,
      timestamp: new Date(),
      isTest: true
    });

  } catch (error) {
    console.error('❌ Error en endpoint de prueba:', error);
    next(error);
  }
};

const getQuickSuggestions = async (req, res, next) => {
  try {
    const { currentText } = req.body;

    const suggestions = [
      '🧠 ¿Me puedes explicar el concepto principal?',
      '💡 ¿Me das un ejemplo práctico?',
      '📝 ¿Me haces un resumen?',
      '🎯 ¿Cómo puedo mejorar mi comprensión?',
      '🚀 ¿Qué debería estudiar después?'
    ];

    if (currentText) {
      suggestions.unshift(`📖 ¿Qué significa "${currentText.title}"?`);
    }

    res.status(200).json({
      success: true,
      suggestions
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  tutorChat,
  tutorChatTest,
  getQuickSuggestions
};
