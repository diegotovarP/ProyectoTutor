const createError = require('http-errors');
const { verifyToken } = require('../services/token.service');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw createError(401, 'Token no suministrado');
    }
    const token = header.replace('Bearer ', '');
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub || decoded.id);
    if (!user) {
      throw createError(401, 'Usuario no encontrado');
    }
    req.user = user;
    next();
  } catch (error) {
    if (!error.status) {
      next(createError(401, 'Token inválido'));
    } else {
      next(error);
    }
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(createError(403, 'Permisos insuficientes'));
  }
  return next();
};

module.exports = {
  authenticate,
  authorize
};
