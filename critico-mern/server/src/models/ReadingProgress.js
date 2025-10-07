const mongoose = require('mongoose');

const ReadingProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  text: { type: mongoose.Schema.Types.ObjectId, ref: 'Text' },
  lastPosition: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  lastMode: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' }
  },
  resumedAt: Date
}, {
  timestamps: true
});

ReadingProgressSchema.index({ student: 1, text: 1 }, { unique: true, partialFilterExpression: { text: { $exists: true } } });
ReadingProgressSchema.index({ student: 1, topic: 1 }, { unique: true, partialFilterExpression: { topic: { $exists: true } } });

module.exports = mongoose.model('ReadingProgress', ReadingProgressSchema);
