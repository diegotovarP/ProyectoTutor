const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

const createStudentAndLogin = async (overrides = {}) => {
  const payload = {
    email: overrides.email || 'student@example.com',
    password: overrides.password || 'Password123',
    firstName: 'Estu',
    lastName: 'Diante',
    role: 'student',
    ...overrides
  };
  await request(app).post('/api/auth/register').send(payload);
  const loginResponse = await request(app).post('/api/auth/login').send({
    email: payload.email,
    password: payload.password
  });
  return loginResponse.body;
};

const createTeacherAndLogin = async (overrides = {}) => {
  const payload = {
    email: overrides.email || 'teacher@example.com',
    password: overrides.password || 'Password123',
    firstName: 'Doc',
    lastName: 'Ente',
    role: 'teacher',
    ...overrides
  };
  await request(app).post('/api/auth/register').send(payload);
  const loginResponse = await request(app).post('/api/auth/login').send({
    email: payload.email,
    password: payload.password
  });
  return loginResponse.body;
};

const findUser = (email) => User.findOne({ email });

module.exports = {
  app,
  createStudentAndLogin,
  createTeacherAndLogin,
  findUser
};
