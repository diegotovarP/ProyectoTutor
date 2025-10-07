const { authenticate, authorize } = require('../../src/middlewares/auth');
const tokenService = require('../../src/services/token.service');
const User = require('../../src/models/User');

const nextFactory = () => jest.fn();

describe('auth middleware', () => {
  it('attaches user to request when token is valid', async () => {
    const user = await User.create({
      email: 'auth@test.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'teacher'
    });

    const token = tokenService.signToken({ sub: user._id });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = nextFactory();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user.email).toBe(user.email);
  });

  it('bubbles unauthorized error when header is missing', async () => {
    const req = { headers: {} };
    const res = {};
    const next = nextFactory();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.status).toBe(401);
  });

  it('denies access when role is insufficient', async () => {
    const user = await User.create({
      email: 'student@test.com',
      password: 'Password123',
      firstName: 'Student',
      lastName: 'Test',
      role: 'student'
    });

    const req = { user };
    const res = {};
    const next = nextFactory();
    const middleware = authorize('teacher', 'admin');

    middleware(req, res, next);
    const error = next.mock.calls[0][0];
    expect(error.status).toBe(403);
  });

  it('allows access when role is among allowed list', () => {
    const req = { user: { role: 'admin' } };
    const res = {};
    const next = nextFactory();
    const middleware = authorize('teacher', 'admin');

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
