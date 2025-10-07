const express = require('express');
const controller = require('../controllers/bias.controller');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Analizar sesgos en contenido directo (sin guardar)
router.post('/analyze-content', authenticate, controller.analyzeTextContent);

// Analizar sesgos en un texto guardado
router.post('/analyze-text/:textId', authenticate, controller.analyzeText);

// Analizar sesgos en una respuesta de estudiante (análisis académico mejorado)
router.post('/analyze-student-answer/:attemptId', authenticate, controller.analyzeStudentAnswer);

// Guardar análisis de sesgos en la BD
router.post('/save-student-analysis/:attemptId', authenticate, controller.saveStudentAnalysis);

// Analizar sesgos en una respuesta de estudiante (método legacy)
router.post('/analyze-attempt/:attemptId', authenticate, controller.analyzeAttempt);

// Obtener sesgos guardados
router.get('/:relatedTo/:relatedId', authenticate, controller.getBiases);

// Marcar sesgo como resuelto
router.patch('/:biasId/resolve', authenticate, controller.resolveBias);

// Estadísticas de sesgos del curso
router.get('/course/:courseId/statistics', authenticate, controller.getCourseStatistics);

// Mantener compatibilidad con rutas antiguas
router.get('/topic/:topicId/summary', authenticate, controller.getTopicSummary);

module.exports = router;
