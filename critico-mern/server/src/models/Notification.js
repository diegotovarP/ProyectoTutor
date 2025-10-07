const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['due_soon', 'course_update', 'feedback', 'system'],
    required: true
  },
  message: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  readAt: Date,
  sendAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);
