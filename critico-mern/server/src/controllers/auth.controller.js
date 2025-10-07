const createError = require('http-errors');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { signToken } = require('../services/token.service');

const formatValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError(422, { errors: errors.array() });
  }
};

const register = async (req, res, next) => {
  try {
    formatValidationErrors(req);
    const { email, password, firstName, lastName, role = 'student', courseIds = [] } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      throw createError(409, 'El correo ya está registrado');
    }

    const user = await User.create({ email, password, firstName, lastName, role });

    if (role === 'student' && courseIds.length) {
      const courses = await Course.find({ _id: { $in: courseIds } });
      await Promise.all(courses.map((course) => Enrollment.create({ student: user._id, course: course._id })));
    }

    const token = signToken({ sub: user._id, role: user.role });
    res.status(201).json({ user: user.toJSON(), token });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    formatValidationErrors(req);
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw createError(401, 'Credenciales inválidas');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw createError(401, 'Credenciales inválidas');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({ sub: user._id, role: user.role });
    res.status(200).json({ user: user.toJSON(), token });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    formatValidationErrors(req);
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'Si el correo existe, se enviaron instrucciones' });
    }
    const token = Math.random().toString(36).substring(2, 10);
    user.recoveryToken = token;
    user.recoveryTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();
    res.status(200).json({ message: 'Instrucciones enviadas', token });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword
};
