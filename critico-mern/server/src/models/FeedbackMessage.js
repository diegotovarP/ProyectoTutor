const mongoose = require('mongoose');

const FeedbackMessageSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  text: { type: mongoose.Schema.Types.ObjectId, ref: 'Text' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  type: { type: String, enum: ['individual', 'massive', 'system'], default: 'individual' },
  deliveredAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('FeedbackMessage', FeedbackMessageSchema);
