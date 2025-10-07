const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  content: { type: String, required: true },
  effectiveDate: { type: Date, required: true },
  requiresAcceptance: { type: Boolean, default: true },
  acceptedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: Date
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Policy', PolicySchema);
