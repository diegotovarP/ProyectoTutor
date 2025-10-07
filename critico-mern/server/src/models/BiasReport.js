const mongoose = require('mongoose');

const BiasReportSchema = new mongoose.Schema({
  text: { type: mongoose.Schema.Types.ObjectId, ref: 'Text', required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  biasType: { type: String, required: true },
  excerpt: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'dismissed'], default: 'pending' },
  confirmation: {
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: Date
  }
}, {
  timestamps: true
});

BiasReportSchema.index({ text: 1, biasType: 1 });

module.exports = mongoose.model('BiasReport', BiasReportSchema);
