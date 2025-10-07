const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: mongoose.Schema.Types.ObjectId, ref: 'Text', required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  reason: { type: String, enum: ['nivelacion', 'ampliacion', 'refuerzo'], required: true },
  status: { type: String, enum: ['pending', 'saved', 'dismissed'], default: 'pending' }
}, {
  timestamps: true
});

RecommendationSchema.index({ student: 1, text: 1 }, { unique: true });

module.exports = mongoose.model('Recommendation', RecommendationSchema);
