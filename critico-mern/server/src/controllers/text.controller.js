const Text = require('../models/Text');
const ReadingProgress = require('../models/ReadingProgress');
const Recommendation = require('../models/Recommendation');
const Topic = require('../models/Topic');
const coraService = require('../services/cora.service');

const getByTopic = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { difficulty, length } = req.query;

    const filter = { topic: topicId };
    if (difficulty) filter.difficulty = difficulty;
    if (length) filter.length = length;

    const texts = await Text.find(filter).lean();
    
    console.log(`📚 Textos encontrados para topic ${topicId}: ${texts.length}`);
    console.log('📄 Títulos:', texts.map(t => t.title));

    const readingState = await ReadingProgress.find({ student: req.user._id, text: { $in: texts.map((t) => t._id) } }).lean();
    const progressMap = readingState.reduce((acc, item) => {
      acc[item.text.toString()] = item;
      return acc;
    }, {});

    const response = texts.map((text) => ({
      id: text._id,
      title: text.title,
      content: text.content,
      source: text.source,
      estimatedTime: text.estimatedTime,
      readingTimeMinutes: text.estimatedTime, 
      tags: text.tags || [],
      difficulty: text.difficulty,
      length: text.length,
      status: text.status || 'approved',
      generatedBy: text.metadata?.generatedBy || null,
      completed: progressMap[text._id.toString()]?.completed || false,
      lastPosition: progressMap[text._id.toString()]?.lastPosition || 0,
      createdAt: text.createdAt
    }));

    console.log(`✅ Enviando ${response.length} textos al frontend`);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const getReaderState = async (req, res, next) => {
  try {
    const { textId } = req.params;
    const text = await Text.findById(textId).lean();
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }

    const progress = await ReadingProgress.findOne({ student: req.user._id, text: textId }).lean();

    res.status(200).json({
      text,
      lastPosition: progress?.lastPosition || 0,
      modePreferences: progress?.lastMode || { theme: 'light', fontSize: 'medium' }
    });
  } catch (error) {
    next(error);
  }
};

const getRecommendations = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const recs = await Recommendation.find({ student: req.user._id, topic: topicId })
      .populate('text', 'title difficulty length tags')
      .lean();

    res.status(200).json(recs.map((rec) => ({
      id: rec._id,
      text: rec.text,
      reason: rec.reason,
      status: rec.status
    })));
  } catch (error) {
    next(error);
  }
};

const previewTextWithAI = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden generar textos con IA' });
    }

    const { topicId } = req.params;
    const { 
      tema, publico, nivel, proposito, ventanaInicio, ventanaFin, idioma, 
      correcciones, 
      textoOriginal, 
      sesgosDetectados, 
      instruccionesDocente 
    } = req.body;

    console.log('📥 Datos recibidos en el controlador:');
    console.log('  - textoOriginal:', textoOriginal ? 'SÍ' : 'NO');
    console.log('  - sesgosDetectados:', sesgosDetectados ? `SÍ (${sesgosDetectados.length})` : 'NO');
    console.log('  - instruccionesDocente:', instruccionesDocente ? 'SÍ' : 'NO');
    console.log('  - correcciones (legacy):', correcciones ? 'SÍ' : 'NO');

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Tema no encontrado' });
    }

    if (!tema || !publico) {
      return res.status(400).json({ message: 'Los campos tema y público son obligatorios' });
    }

    let configMessage = {
      tema,
      publico,
      nivel,
      proposito,
      ventanaInicio,
      ventanaFin,
      idioma
    };

    // ✅ NUEVO: Soporte para el formato estructurado del agente CORA
    if (sesgosDetectados && Array.isArray(sesgosDetectados) && sesgosDetectados.length > 0) {
      configMessage.textoOriginal = textoOriginal;
      configMessage.sesgosDetectados = sesgosDetectados;
      configMessage.instruccionesDocente = instruccionesDocente;
      console.log('✅ Modo corrección de sesgos activado');
      console.log(`📊 Sesgos a corregir: ${sesgosDetectados.length}`);
      console.log('📋 Detalle sesgos:', JSON.stringify(sesgosDetectados, null, 2));
    } 
    // Mantener compatibilidad con formato antiguo
    else if (correcciones && correcciones.trim()) {
      configMessage.correcciones = correcciones;
      console.log('⚠️  Usando formato legacy de correcciones');
    }

    const coraResponse = await coraService.generateEducationalText(configMessage);

    const generatedContent = coraResponse.choices[0].message.content;

    res.status(200).json({
      success: true,
      preview: true,
      text: {
        title: `${tema} - ${nivel || 'intermedio'}`,
        content: generatedContent,
        difficulty: nivel || 'intermedio',
        estimatedTime: Math.ceil(generatedContent.length / 1000),
        metadata: {
          publico,
          nivel: nivel || 'intermedio',
          proposito: proposito || 'aplicar',
          ventana: `${ventanaInicio || '2020'}-${ventanaFin || '2025'}`,
          idioma: idioma || 'español',
          model: coraResponse.model,
          tokens: coraResponse.usage?.total_tokens
        }
      }
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

const saveApprovedText = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden guardar textos' });
    }

    const { topicId } = req.params;
    const { title, content, difficulty, estimatedTime, metadata, tags, source } = req.body;
    
    console.log('📝 Guardando texto en topic:', topicId);
    console.log('📊 Datos recibidos:', { title, source, difficulty, estimatedTime });

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Tema no encontrado' });
    }

    if (!content || !title) {
      return res.status(400).json({ message: 'El título y contenido son obligatorios' });
    }

    const isAIGenerated = metadata?.generatedBy || !source || source.includes('IA') || source.includes('CORA');
    const finalSource = source || (isAIGenerated ? 'Generado por IA (CORA)' : 'Escrito manualmente');

    const text = await Text.create({
      topic: topicId,
      title,
      content,
      difficulty: difficulty || 'intermedio',
      source: finalSource,
      estimatedTime: estimatedTime || Math.ceil(content.length / 1000),
      tags: tags || [],
      metadata: isAIGenerated ? {
        ...metadata,
        generatedBy: 'CORA',
        generatedAt: metadata?.generatedAt || new Date(),
        approvedBy: req.user._id,
        approvedAt: new Date()
      } : {
        createdBy: req.user._id,
        createdAt: new Date()
      },
      order: 1
    });

    console.log('✅ Texto guardado en BD:', text._id);
    console.log('📊 Detalles:', { title: text.title, topic: text.topic, source: text.source });

    res.status(201).json({
      success: true,
      message: 'Texto guardado exitosamente',
      text: {
        id: text._id,
        title: text.title,
        content: text.content,
        difficulty: text.difficulty,
        source: text.source,
        estimatedTime: text.estimatedTime,
        metadata: text.metadata,
        createdAt: text.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

const createText = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden crear textos' });
    }

    const { topic, title, content, difficulty, source, estimatedTime, tags, metadata, order } = req.body;

    if (!topic || !title || !content) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const text = await Text.create({
      topic,
      title,
      content,
      difficulty: difficulty || 'intermediate',
      source: source || 'Manual',
      estimatedTime: estimatedTime || 10,
      tags: tags || [],
      metadata: metadata || {},
      order: order || 1
    });

    res.status(201).json(text);
  } catch (error) {
    next(error);
  }
};

async function deleteText(req, res) {
  try {
    const { textId } = req.params;
    const Question = require('../models/Question');
    
    await Question.deleteMany({ text: textId });
    
    const text = await Text.findByIdAndDelete(textId);
    
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }
    
    res.json({ message: 'Texto y preguntas eliminados exitosamente' });
  } catch (err) {
    console.error('Error al eliminar texto:', err);
    res.status(500).json({ message: 'Error al eliminar el texto' });
  }
}

async function regenerateText(req, res) {
  try {
    const { textId } = req.params;
    const { instrucciones } = req.body;
    
    const text = await Text.findById(textId).populate('topic');
    
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }

    // Verificar permisos
    if (text.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Importar servicios necesarios
    const biasService = require('../services/bias.service');
    const coraService = require('../services/cora.service');

    // Obtener sesgos detectados
    const { biases } = await biasService.getBiases('text', textId);
    
    if (biases.length === 0) {
      return res.status(400).json({ 
        message: 'Primero debes analizar los sesgos del texto' 
      });
    }

    // Generar prompt de mejora
    const improvementPrompt = await biasService.generateImprovementPrompt(
      'text',
      textId,
      instrucciones || ''
    );

    // Construir mensaje para CORA
    const configMessage = `${improvementPrompt}\n\nTEXTO ORIGINAL:\n${text.content}`;

    // Regenerar texto con CORA
    const coraResponse = await coraService.generateEducationalText(configMessage);
    
    if (!coraResponse || !coraResponse.content) {
      throw new Error('No se pudo generar el texto mejorado');
    }

    // Guardar versión original si no existe
    if (!text.metadata) text.metadata = {};
    if (!text.metadata.originalVersion) {
      text.metadata.originalVersion = text.content;
    }

    // Actualizar texto
    text.content = coraResponse.content;
    text.metadata.wasImproved = true;
    text.metadata.improvementInstructions = instrucciones;
    text.metadata.generationAttempts = (text.metadata.generationAttempts || 1) + 1;
    
    await text.save();

    // Re-analizar sesgos del texto mejorado
    const newResult = await biasService.analyzeBiasesAndSave(
      text.content,
      'text',
      text._id,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Texto regenerado exitosamente',
      text: {
        id: text._id,
        title: text.title,
        content: text.content,
        originalVersion: text.metadata.originalVersion
      },
      biasAnalysis: {
        previousBiases: biases.length,
        currentBiases: newResult.biases.length,
        improvement: biases.length - newResult.biases.length,
        statistics: newResult.statistics,
        quality: newResult.quality
      }
    });
  } catch (err) {
    console.error('Error al regenerar texto:', err);
    res.status(500).json({ message: 'Error al regenerar el texto', error: err.message });
  }
}

async function updateText(req, res, next) {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo docentes pueden actualizar textos' });
    }

    const { textId } = req.params;
    const { title, content, difficulty, source, estimatedTime, tags, metadata } = req.body;

    const text = await Text.findById(textId);
    
    if (!text) {
      return res.status(404).json({ message: 'Texto no encontrado' });
    }

    if (title !== undefined) text.title = title;
    if (content !== undefined) text.content = content;
    if (difficulty !== undefined) text.difficulty = difficulty;
    if (source !== undefined) text.source = source;
    if (estimatedTime !== undefined) text.estimatedTime = estimatedTime;
    if (tags !== undefined) text.tags = tags;
    if (metadata !== undefined) text.metadata = { ...text.metadata, ...metadata };

    await text.save();

    res.status(200).json({
      success: true,
      message: 'Texto actualizado exitosamente',
      text: {
        id: text._id,
        title: text.title,
        content: text.content,
        difficulty: text.difficulty,
        source: text.source,
        estimatedTime: text.estimatedTime,
        tags: text.tags,
        metadata: text.metadata
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getByTopic,
  getReaderState,
  getRecommendations,
  previewTextWithAI,
  saveApprovedText,
  createText,
  deleteText,
  regenerateText,
  updateText
};
