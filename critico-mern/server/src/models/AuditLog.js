const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  occurredAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

AuditLogSchema.index({ occurredAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
