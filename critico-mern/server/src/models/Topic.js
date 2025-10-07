const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: String,
  order: { type: Number, default: 0 },
  releaseDate: Date,
  dueDate: Date,
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
  isPublished: { type: Boolean, default: false },
  objectives: [{
    type: String,
    enum: ['inference', 'evidence', 'counterargument', 'bias-detection', 'synthesis']
  }],
  recommendedFocus: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Topic', TopicSchema);
