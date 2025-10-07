const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  topicCount: { type: Number, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  objectives: [{ type: String }],
  tags: [{ type: String }],
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  startDate: Date,
  endDate: Date,
  reminders: [{
    dueDate: Date,
    type: { type: String, enum: ['due_soon', 'due_today', 'overdue'], default: 'due_soon' }
  }],
  analytics: {
    averageScore: { type: Number, default: 0 },
    totalTextsRead: { type: Number, default: 0 },
    totalQuestionsAnswered: { type: Number, default: 0 },
    biasTrends: [{ type: String }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', CourseSchema);
