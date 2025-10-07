const request = require('supertest');
const { app, createStudentAndLogin } = require('../utils');
const Course = require('../../src/models/Course');
const Topic = require('../../src/models/Topic');
const Text = require('../../src/models/Text');
const Enrollment = require('../../src/models/Enrollment');
const Bias = require('../../src/models/Bias');

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('Bias workflow', () => {
  it('analyzes raw content and returns statistics', async () => {
    const { token } = await createStudentAndLogin({ email: 'bias-analyze@example.com' });

    const content = 'Todos los estudiantes siempre comprenden cada lección sin necesidad de practicar o contrastar fuentes.' +
      ' Esta afirmación ignora variaciones y nunca aporta datos cuantitativos que respalden la conclusión general.';

    const analyzeResponse = await request(app)
      .post('/api/bias/analyze-content')
      .set(authHeader(token))
      .send({ content })
      .expect(200);

    expect(analyzeResponse.body.biases.length).toBeGreaterThan(0);
    expect(analyzeResponse.body.statistics.total).toBeGreaterThan(0);
    expect(analyzeResponse.body.quality).toHaveProperty('score');
    expect(analyzeResponse.body.biases.map((b) => b.type)).toContain('generalización');
  });

  it('retrieves stored biases with aggregated statistics', async () => {
    const { token, user } = await createStudentAndLogin({ email: 'bias-storage@example.com' });

    const course = await Course.create({ title: 'Sesgos avanzados', owner: user._id });
    const topic = await Topic.create({ course: course._id, title: 'Falacias', order: 1, isPublished: true });
    const text = await Text.create({
      topic: topic._id,
      title: 'Análisis de falacias',
      source: 'Revista Z',
      estimatedTime: 12,
      difficulty: 'intermediate',
      length: 'medium',
      tags: ['sesgos'],
      content: 'Contenido con sesgos que exagera y absolutiza conclusiones.'
    });

    await Enrollment.create({ student: user._id, course: course._id });

    await Bias.create([
      {
        relatedTo: 'text',
        relatedId: text._id,
        type: 'generalización',
        confidence: 0.9,
        description: 'Uso de absolutos',
        location: 'Todos los casos',
        suggestion: 'Utilizar cuantificadores parciales',
        severity: 'alta'
      },
      {
        relatedTo: 'text',
        relatedId: text._id,
        type: 'polarización',
        confidence: 0.7,
        description: 'Lenguaje dicotómico',
        location: 'Siempre / nunca',
        suggestion: 'Incorporar matices',
        severity: 'media'
      }
    ]);

    const storedResponse = await request(app)
      .get(`/api/bias/text/${text._id}`)
      .set(authHeader(token))
      .expect(200);

    expect(storedResponse.body.biases).toHaveLength(2);
    expect(storedResponse.body.statistics.total).toBe(2);
    expect(storedResponse.body.statistics.byType.generalización).toBe(1);
    expect(storedResponse.body.quality.level).toBe('bueno');
  });
});
