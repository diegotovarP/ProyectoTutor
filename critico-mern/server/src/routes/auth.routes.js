const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/auth.controller');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Correo inválido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('role').optional().isIn(['student', 'teacher', 'admin'])
  ],
  controller.register
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  controller.login
);

router.post(
  '/forgot-password',
  [
    body('email').isEmail()
  ],
  controller.forgotPassword
);

module.exports = router;
