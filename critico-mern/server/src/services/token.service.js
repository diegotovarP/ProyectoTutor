const jwt = require('jsonwebtoken');

const signToken = (payload, options = {}) => {
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresIn = options.expiresIn || process.env.JWT_EXPIRES_IN || '1d';
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'secret';
  return jwt.verify(token, secret);
};

module.exports = {
  signToken,
  verifyToken
};
