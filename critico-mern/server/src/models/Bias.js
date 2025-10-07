const mongoose = require('mongoose');

const biasSchema = new mongoose.Schema({
  // Referencia al texto o respuesta analizada
  relatedTo: {
    type: String,
    enum: ['text', 'attempt'],
    required: true
  },
  
  // ID del texto o intento al que pertenece
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'relatedTo'
  },
  
  // Información del análisis
  type: {
    type: String,
    enum: ['generalización', 'emocional', 'confirmación', 'polarización', 'ad hominem', 'selección', 'desinformación'],
    required: true
  },
  
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  location: {
    type: String,
    default: 'No especificado'
  },
  
  suggestion: {
    type: String,
    required: true
  },
  
  severity: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  },
  
  // ✅ NUEVO: Lista de palabras problemáticas específicas
  problematicWords: {
    type: [String],
    default: []
  },
  
  // Si viene de fact-check externo
  factCheckUrl: String,
  source: String,
  
  // Metadatos
  analyzedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  analyzedAt: {
    type: Date,
    default: Date.now
  },
  
  // Si el sesgo fue resuelto/mejorado
  resolved: {
    type: Boolean,
    default: false
  },
  
  resolvedAt: Date,
  resolvedNote: String
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
biasSchema.index({ relatedTo: 1, relatedId: 1 });
biasSchema.index({ type: 1, severity: 1 });
biasSchema.index({ analyzedAt: -1 });
biasSchema.index({ resolved: 1 });

// Método estático para obtener estadísticas
biasSchema.statics.getStatistics = async function(relatedTo, relatedId) {
  const biases = await this.find({ relatedTo, relatedId });
  
  const stats = {
    total: biases.length,
    byType: {},
    bySeverity: { alta: 0, media: 0, baja: 0 },
    averageConfidence: 0,
    resolved: 0,
    pending: 0
  };
  
  if (biases.length === 0) return stats;
  
  let totalConfidence = 0;
  
  biases.forEach(bias => {
    // Por tipo
    stats.byType[bias.type] = (stats.byType[bias.type] || 0) + 1;
    
    // Por severidad
    stats.bySeverity[bias.severity]++;
    
    // Confianza
    totalConfidence += bias.confidence;
    
    // Resueltos
    if (bias.resolved) {
      stats.resolved++;
    } else {
      stats.pending++;
    }
  });
  
  stats.averageConfidence = totalConfidence / biases.length;
  
  return stats;
};

// Método estático para calcular calidad del texto
biasSchema.statics.assessQuality = async function(relatedTo, relatedId) {
  const stats = await this.getStatistics(relatedTo, relatedId);
  
  if (stats.total === 0) {
    return {
      level: 'excelente',
      score: 100,
      message: 'El texto muestra un excelente nivel de objetividad'
    };
  }
  
  // Calcular puntaje (0-100)
  let score = 100;
  score -= (stats.bySeverity.alta * 15);
  score -= (stats.bySeverity.media * 8);
  score -= (stats.bySeverity.baja * 3);
  score = Math.max(0, score);
  
  let level, message;
  if (score >= 90) {
    level = 'excelente';
    message = 'El texto es muy objetivo con sesgos mínimos';
  } else if (score >= 75) {
    level = 'bueno';
    message = 'El texto es generalmente objetivo con algunos sesgos menores';
  } else if (score >= 60) {
    level = 'aceptable';
    message = 'El texto tiene varios sesgos que podrían mejorarse';
  } else if (score >= 40) {
    level = 'necesita mejoras';
    message = 'El texto contiene múltiples sesgos significativos';
  } else {
    level = 'problemático';
    message = 'El texto requiere revisión importante por sesgos graves';
  }
  
  return { level, score, message, stats };
};

module.exports = mongoose.model('Bias', biasSchema);
