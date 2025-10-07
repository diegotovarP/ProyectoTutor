const createError = require('http-errors');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      throw createError(422, 'Rol inválido');
    }
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) {
      throw createError(404, 'Usuario no encontrado');
    }
    await AuditLog.create({
      actor: req.user._id,
      action: 'update-role',
      resourceType: 'User',
      resourceId: userId,
      metadata: { role }
    });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const listAuditLogs = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.occurredAt = {};
      if (from) filter.occurredAt.$gte = new Date(from);
      if (to) filter.occurredAt.$lte = new Date(to);
    }
    const logs = await AuditLog.find(filter).sort({ occurredAt: -1 }).limit(200);
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateUserRole,
  listAuditLogs
};
