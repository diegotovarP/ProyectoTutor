const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  progress: {
    completion: { type: Number, default: 0 },
    level: { type: String, enum: ['incipiente', 'basico', 'intermedio', 'avanzado'], default: 'incipiente' },
    lastAccessAt: Date
  },
  notifications: {
    dueSoon: { type: Boolean, default: true },
    lastReminderSentAt: Date
  }
}, {
  timestamps: true
});

EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', EnrollmentSchema);
