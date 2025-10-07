const mongoose = require('mongoose');

const BiasSchema = new mongoose.Schema({
  type: { type: String, required: true },
  excerpt: { type: String, required: true },
  explanation: { type: String, required: true },
  status: { type: String, enum: ['suggested', 'confirmed', 'dismissed'], default: 'suggested' },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const TextSchema = new mongoose.Schema({
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  title: { type: String, required: true },
  source: { type: String, default: '' },
  estimatedTime: { type: Number, default: 10 },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'básico', 'intermedio', 'avanzado'], default: 'beginner' },
  length: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
  tags: [{ type: String }],
  content: { type: String, required: true },
  order: { type: Number, default: 1 },
  metadata: {
    publico: { type: String },
    nivel: { type: String },
    proposito: { type: String },
    ventana: { type: String },
    idioma: { type: String },
    generatedBy: { type: String },
    generatedAt: { type: Date }
  },
  modePreferences: {
    hasDarkMode: { type: Boolean, default: true },
    hasFontResize: { type: Boolean, default: true }
  },
  biasDetections: [BiasSchema],
  recommendations: [{
    reason: { type: String, enum: ['nivelacion', 'ampliacion', 'refuerzo'], required: true },
    targetAudience: { type: String, enum: ['student', 'teacher'], default: 'student' }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Text', TextSchema);
