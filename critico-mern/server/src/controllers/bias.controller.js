const biasService = require('../services/bias.service');
const coraService = require('../services/cora.service');
const Text = require('../models/Text');
const QuestionAttempt = require('../models/QuestionAttempt');

const normalizeQuestionSkill = (rawSkill) => {
  if (!rawSkill) {
    return 'literal';
  }

  const normalized = rawSkill.toString().trim().toLowerCase();
  const withoutAccents = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  switch (withoutAccents) {
    case 'literal':
      return 'literal';
    case 'inferencial':
    case 'inferencia':
      return 'inferencia';
    case 'critica':
      return 'crítica';
    case 'aplicacion':
      return 'aplicación';
    default:
      return rawSkill;
  }
};

const normalizeDidacticReportForSave = (report) => {
  if (!report) return undefined;

  if (typeof report === 'string') {
    return {
      raw: report,
      text: report
    };
  }

  if (typeof report !== 'object') {
    return undefined;
  }

  const normalized = { ...report };

  if (normalized.content && !normalized.text) {
    normalized.text = normalized.content;
  }

  if (!normalized.raw && normalized.text) {
    normalized.raw = normalized.text;
  }

  if (Array.isArray(normalized.paragraphs)) {
    normalized.paragraphs = normalized.paragraphs.map(item => typeof item === 'string' ? item : String(item));
  }

  if (Array.isArray(normalized.examples)) {
    normalized.examples = normalized.examples.map(item => typeof item === 'string' ? item : String(item));
  }

  if (Array.isArray(normalized.glossary)) {
    normalized.glossary = normalized.glossary.map(item => typeof item === 'string' ? item : String(item));
  }

  if (Array.isArray(normalized.questions)) {
    normalized.questions = normalized.questions.map(item => typeof item === 'string' ? item : String(item));
  }

  if (Array.isArray(normalized.warnings)) {
    normalized.warnings = normalized.warnings.map(item => typeof item === 'string' ? item : String(item));
  }

  return normalized;
};

const buildBiasAnalysisRecord = (analysisData = {}) => {
  const record = {
    score: analysisData.score ?? null,
    maxScore: analysisData.maxScore ?? null,
    nivel: analysisData.nivel || '',
    mensaje: analysisData.mensaje || '',
    biasesDetected: analysisData.biasesDetected ?? (Array.isArray(analysisData.biases) ? analysisData.biases.length : 0),
    biases: Array.isArray(analysisData.biases) ? analysisData.biases : [],
    recomendaciones: Array.isArray(analysisData.recomendaciones) ? analysisData.recomendaciones : [],
    didacticReport: normalizeDidacticReportForSave(analysisData.didacticReport),
    analyzedAt: analysisData.analyzedAt ? new Date(analysisData.analyzedAt) : new Date()
  };

  if (!record.didacticReport) {
    delete record.didacticReport;
  }

  return record;
};

/**
 * Analizar sesgos en un texto generado (guardado)
 */
const analyzeText = async (req, res, next) => {
  try {
    const { textId } = req.params;
    
    const text = await Text.findById(textId);
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }

    // Verificar permisos
    if (text.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Analizar y guardar sesgos
    const result = await biasService.analyzeBiasesAndSave(
      text.content,
      'text',
      text._id,
      req.user._id
    );

    res.json({
      textId: text._id,
      ...result,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Error al analizar texto:', error);
    next(error);
  }
};

/**
 * Analizar sesgos en texto sin guardar (preview)
 */
const analyzeTextContent = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string' || content.trim().length < 50) {
      return res.status(400).json({ 
        message: 'El contenido del texto es requerido (mínimo 50 caracteres)' 
      });
    }

    // Analizar sesgos sin guardar en BD
    const biases = await biasService.analyzeBiases(content);
    const statistics = biasService.generateBiasStatistics(biases);
    const quality = biasService.assessTextQuality(biases);

    res.json({
      biases,
      statistics,
      quality,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Error al analizar contenido:', error);
    next(error);
  }
};

/**
 * Analizar sesgos en una respuesta de estudiante
 */
const analyzeAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    
    const attempt = await QuestionAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Intento no encontrado' });
    }

    // Verificar permisos
    if (attempt.student.toString() !== req.user._id.toString() && req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Analizar solo si es texto
    if (typeof attempt.answer !== 'string' || attempt.answer.length < 20) {
      return res.status(400).json({ 
        message: 'La respuesta es muy corta para analizar sesgos (mínimo 20 caracteres)' 
      });
    }

    // Analizar y guardar sesgos
    const result = await biasService.analyzeBiasesAndSave(
      attempt.answer,
      'attempt',
      attempt._id,
      req.user._id
    );

    res.json({
      attemptId: attempt._id,
      questionId: attempt.question,
      ...result,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Error al analizar respuesta:', error);
    next(error);
  }
};

/**
 * Obtener sesgos de un texto o intento
 */
const getBiases = async (req, res, next) => {
  try {
    const { relatedTo, relatedId } = req.params;
    
    if (!['text', 'attempt'].includes(relatedTo)) {
      return res.status(400).json({ message: 'Tipo inválido. Usa "text" o "attempt"' });
    }

    const result = await biasService.getBiases(relatedTo, relatedId);
    
    res.json(result);
  } catch (error) {
    console.error('Error al obtener sesgos:', error);
    next(error);
  }
};

/**
 * Marcar un sesgo como resuelto
 */
const resolveBias = async (req, res, next) => {
  try {
    const { biasId } = req.params;
    const { note } = req.body;

    const bias = await biasService.resolveBias(biasId, note);

    res.json({
      message: 'Sesgo marcado como resuelto',
      bias
    });
  } catch (error) {
    console.error('Error al resolver sesgo:', error);
    next(error);
  }
};

/**
 * Obtener estadísticas de sesgos del curso
 */
const getCourseStatistics = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const statistics = await biasService.getCourseStatistics(courseId);
    
    res.json(statistics);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    next(error);
  }
};

const getTopicSummary = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    res.status(501).json({ message: 'No implementado aún' });
  } catch (error) {
    next(error);
  }
};

/**
 * Analizar sesgos en respuesta de estudiante (análisis académico)
 * Endpoint especializado para estudiantes que quieren ver el análisis de su respuesta
 */
const analyzeStudentAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { regenerate } = req.query; // ?regenerate=true para forzar nuevo análisis

    console.log(`📊 Analizando respuesta del estudiante en attempt ${attemptId}...`);
    
    // 1. Buscar el intento y poblar pregunta y texto
    const attempt = await QuestionAttempt.findById(attemptId)
      .populate({
        path: 'question',
        populate: { path: 'text' }
      });
    
    if (!attempt) {
      return res.status(404).json({ message: 'Respuesta no encontrada' });
    }

    // Verificar permisos
    const isOwner = attempt.student.toString() === req.user._id.toString();
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';
    
    if (!isOwner && !isTeacher) {
      return res.status(403).json({ message: 'No autorizado para ver este análisis' });
    }

    // 2. Si ya tiene análisis guardado Y NO se solicita regenerar, devolver el guardado
    if (attempt.biasAnalysis && regenerate !== 'true') {
      console.log('✅ Devolviendo análisis guardado previamente');
      return res.json({
        attemptId: attempt._id,
        questionId: attempt.question._id,
        studentId: attempt.student,
        ...attempt.biasAnalysis.toObject(),
        saved: true,
        analyzedAt: attempt.biasAnalysis.analyzedAt,
        isOwner
      });
    }

    console.log(regenerate === 'true' ? '🔄 Regenerando análisis...' : '🆕 Generando nuevo análisis...');

    // 3. Extraer la respuesta correctamente
    const question = attempt.question;
    const text = question?.text;
    const normalizedSkill = normalizeQuestionSkill(question?.tipo);
    
    let studentAnswer = '';
    
    if (attempt.answers && attempt.answers.length > 0) {
      studentAnswer = attempt.answers[0].value || '';
      console.log(`✅ Respuesta extraída de answers array: "${studentAnswer.substring(0, 50)}..."`);
    } else if (attempt.answer) {
      studentAnswer = attempt.answer;
      console.log(`⚠️ Respuesta extraída del campo legacy 'answer'`);
    }
    
    if (!studentAnswer || studentAnswer.length < 10) {
      return res.status(400).json({ 
        message: 'La respuesta es demasiado corta para analizar (mínimo 10 caracteres)',
        length: studentAnswer.length
      });
    }

    const textContext = text?.content || '';
    
    console.log(`📝 Pregunta: ${question?.prompt?.substring(0, 100)}...`);
    console.log(`📊 Tipo: ${normalizedSkill}`);
    console.log(`📄 Contexto disponible: ${textContext.length} caracteres`);
    
    // 4. Analizar sesgos en la respuesta
    const analysis = await biasService.analyzeStudentAnswer(
      studentAnswer,
      {
        pregunta: question?.prompt || '',
        tipo: normalizedSkill,
        explicacion: question?.feedbackTemplate || ''
      },
      textContext
    );

    // 5. Generar reporte didáctico con CORA
    let didacticReport = null;
    try {
      const currentYear = new Date().getFullYear();
      const coraResponse = await coraService.generateBiasDidacticPack({
        tema: question?.text?.title || question?.prompt || 'Análisis de sesgos en respuestas estudiantiles',
        publico: 'Estudiantes de educación media',
        nivel: normalizedSkill,
        proposito: 'Comprender y corregir los sesgos presentes en la respuesta del estudiante',
        ventanaInicio: currentYear - 4,
        ventanaFin: currentYear,
        idioma: 'español',
        pregunta: question?.prompt || '',
        respuestaEstudiante: studentAnswer,
        textoContexto: textContext,
        sesgosDetectados: analysis.biases,
        puntuacion: analysis.score,
        maxScore: analysis.maxScore,
        nivelCalidad: analysis.nivel,
        recomendaciones: analysis.recomendaciones
      });

      const content = coraResponse?.choices?.[0]?.message?.content || '';
      const parsedReport = biasService.parseDidacticReport(content);

      if (coraResponse?.validationWarnings && parsedReport) {
        parsedReport.warnings = coraResponse.validationWarnings;
      }

      didacticReport = parsedReport || { raw: content, text: content };
    } catch (coraError) {
      console.error('⚠️  No se pudo generar informe didáctico con CORA:', coraError.message);
      didacticReport = null;
    }

    // 6. Preparar respuesta completa
    const fullAnalysis = {
      biases: analysis.biases,
      statistics: analysis.statistics,
      score: analysis.score,
      maxScore: analysis.maxScore,
      nivel: analysis.nivel,
      mensaje: analysis.mensaje,
      recomendaciones: analysis.recomendaciones,
      didacticReport,
      analyzedAt: new Date(),
      saved: false
    };

    res.json({
      attemptId: attempt._id,
      questionId: question?._id,
      studentId: attempt.student,
      questionType: question?.tipo,
      answer: studentAnswer,
      ...fullAnalysis,
      saved: false, // Aún no guardado
      isOwner
    });
  } catch (error) {
    console.error('Error al analizar respuesta de estudiante:', error);
    next(error);
  }
};

/**
 * Guardar análisis de sesgos en la BD
 * POST /api/biases/save-student-analysis/:attemptId
 */
const saveStudentAnalysis = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const analysisData = req.body;

    console.log(`💾 Guardando análisis de sesgos para attempt ${attemptId}...`);
    
    const attempt = await QuestionAttempt.findById(attemptId);
    
    if (!attempt) {
      return res.status(404).json({ message: 'Respuesta no encontrada' });
    }

    // Verificar permisos
    const isOwner = attempt.student.toString() === req.user._id.toString();
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';
    
    if (!isOwner && !isTeacher) {
      return res.status(403).json({ message: 'No autorizado para guardar este análisis' });
    }

    const normalizedAnalysis = buildBiasAnalysisRecord(analysisData);

    attempt.biasAnalysis = normalizedAnalysis;
    
    await attempt.save();
    
    console.log('✅ Análisis de sesgos guardado exitosamente');
    
    res.json({
      message: 'Análisis guardado exitosamente',
      attemptId: attempt._id,
      analyzedAt: attempt.biasAnalysis.analyzedAt,
      saved: true,
      biasAnalysis: attempt.biasAnalysis?.toObject ? attempt.biasAnalysis.toObject() : attempt.biasAnalysis
    });
  } catch (error) {
    console.error('Error al guardar análisis de sesgos:', error);
    next(error);
  }
};

module.exports = {
  analyzeText,
  analyzeTextContent,
  analyzeAttempt,
  getBiases,
  resolveBias,
  getCourseStatistics,
  getTopicSummary,
  analyzeStudentAnswer,
  saveStudentAnalysis
};
