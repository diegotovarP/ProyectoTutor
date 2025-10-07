const jwt = require('jsonwebtoken');
const tokenService = require('../../src/services/token.service');

describe('token.service', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '2h';
  });

  it('generates a signed token with default expiration', () => {
    const token = tokenService.signToken({ sub: 'user-id' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe('user-id');
    expect(decoded.exp).toBeDefined();
  });

  it('honours custom expiration options', () => {
    const token = tokenService.signToken({ role: 'admin' }, { expiresIn: '15m' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('admin');
  });

  it('verifies a provided token and returns payload', () => {
    const signed = jwt.sign({ foo: 'bar' }, process.env.JWT_SECRET);
    expect(tokenService.verifyToken(signed)).toMatchObject({ foo: 'bar' });
  });
});
