const request = require('supertest');
const app = require('../../src/app');

describe('Auth endpoints', () => {
  it('registers and logs in a student', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newstudent@example.com',
        password: 'Password123',
        firstName: 'Nuevo',
        lastName: 'Estudiante'
      })
      .expect(201);

    expect(registerResponse.body.user.email).toBe('newstudent@example.com');
    expect(registerResponse.body.token).toBeDefined();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'newstudent@example.com',
        password: 'Password123'
      })
      .expect(200);

    expect(loginResponse.body.user.firstName).toBe('Nuevo');
    expect(loginResponse.body.token).toBeDefined();
  });

  it('rejects invalid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'wrong@example.com',
        password: 'Password123',
        firstName: 'Wrong',
        lastName: 'User'
      });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'invalid'
      })
      .expect(401);

    expect(response.body.message).toBe('Credenciales inválidas');
  });

  it('sends recovery instructions', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'recover@example.com',
        password: 'Password123',
        firstName: 'Reco',
        lastName: 'Verable'
      });

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'recover@example.com' })
      .expect(200);

    expect(response.body.message).toMatch(/Instrucciones/);
    expect(response.body.token).toHaveLength(8);
  });
});
