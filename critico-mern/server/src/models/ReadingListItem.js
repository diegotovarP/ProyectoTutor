const mongoose = require('mongoose');

const ReadingListItemSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: mongoose.Schema.Types.ObjectId, ref: 'Text', required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  savedAt: { type: Date, default: Date.now },
  completedAt: Date
}, {
  timestamps: true
});

ReadingListItemSchema.index({ student: 1, text: 1 }, { unique: true });

module.exports = mongoose.model('ReadingListItem', ReadingListItemSchema);
