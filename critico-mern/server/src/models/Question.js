const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  text: { type: mongoose.Schema.Types.ObjectId, ref: 'Text', required: true },
  skill: {
    type: String,
    enum: ['literal', 'inferencial', 'crítica', 'aplicación'],
    required: true
  },
  type: { type: String, enum: ['multiple-choice', 'open-ended'], default: 'multiple-choice' },
  prompt: { type: String, required: true },
  options: {
    type: [OptionSchema],
    validate: {
      validator(value) {
        return this.type === 'open-ended' || value.length >= 2;
      },
      message: 'Las preguntas de opción múltiple requieren al menos 2 opciones'
    }
  },
  rubric: {
    criteria: [{
      title: String,
      description: String,
      levels: [{ label: String, score: Number }]
    }]
  },
  feedbackTemplate: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', QuestionSchema);
