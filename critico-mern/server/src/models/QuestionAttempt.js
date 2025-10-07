const mongoose = require('mongoose');

const BiasDetailSchema = new mongoose.Schema({
  type: String,
  tag: String,
  description: String,
  location: String,
  suggestion: String,
  impact: String,
  severity: String,
  palabrasProblematicas: [String],
  scoreImpact: Number,
  coverageRatio: Number,
  conceptosClaveDetectados: [String]
}, { _id: false });

const DidacticReportSchema = new mongoose.Schema({
  raw: String,
  text: String,
  paragraphs: [String],
  examples: [String],
  glossary: [String],
  questions: [String],
  warnings: [String]
}, { _id: false });

const BiasAnalysisSchema = new mongoose.Schema({
  score: Number,
  maxScore: Number,
  nivel: String,
  mensaje: String,
  biasesDetected: Number,
  biases: [BiasDetailSchema],
  recomendaciones: [String],
  didacticReport: DidacticReportSchema,
  analyzedAt: Date
}, { _id: false });

const QuestionAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  text: { type: mongoose.Schema.Types.ObjectId, ref: 'Text', required: true },
  answers: [{
    value: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean
  }],
  score: { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },
  completedAt: Date,
  autoFeedback: String,
  feedback: String,
  feedbackGeneratedAt: Date,
  requiresReview: { type: Boolean, default: false },
  biasAnalysis: BiasAnalysisSchema
}, {
  timestamps: true
});

QuestionAttemptSchema.index({ student: 1, question: 1, createdAt: -1 });

module.exports = mongoose.model('QuestionAttempt', QuestionAttemptSchema);
