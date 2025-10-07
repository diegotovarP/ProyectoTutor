const request = require('supertest');
const { app, createTeacherAndLogin, createStudentAndLogin } = require('../utils');
const Course = require('../../src/models/Course');
const Topic = require('../../src/models/Topic');
const Text = require('../../src/models/Text');
const Enrollment = require('../../src/models/Enrollment');
const ReadingProgress = require('../../src/models/ReadingProgress');
const Question = require('../../src/models/Question');
const QuestionAttempt = require('../../src/models/QuestionAttempt');

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('Progress endpoints', () => {
  it('returns aggregated enrollment and text progress for a student', async () => {
    const { token: teacherToken, user: teacher } = await createTeacherAndLogin({
      email: 'progress-teacher@example.com'
    });
    const { user: student } = await createStudentAndLogin({
      email: 'progress-student@example.com'
    });

    const course = await Course.create({
      title: 'Evaluación crítica',
      owner: teacher._id,
      description: 'Curso completo'
    });

    await Enrollment.create({
      student: student._id,
      course: course._id,
      progress: {
        completion: 60,
        level: 'intermedio',
        lastAccessAt: new Date('2024-01-15T10:00:00Z')
      }
    });

    const topic = await Topic.create({
      course: course._id,
      title: 'Interpretación de textos',
      order: 1,
      isPublished: true
    });

    const text = await Text.create({
      topic: topic._id,
      title: 'Lectura crítica de editoriales',
      content: 'Contenido para analizar sesgos autorales.',
      source: 'Manual docente',
      estimatedTime: 15,
      difficulty: 'intermediate',
      length: 'medium',
      tags: ['editorial']
    });

    await ReadingProgress.create({
      student: student._id,
      topic: topic._id,
      text: text._id,
      completed: true,
      lastPosition: 50,
      score: 85,
      lastMode: { theme: 'dark', fontSize: 'large' }
    });

    const response = await request(app)
      .get(`/api/progress/student/${student._id}`)
      .set(authHeader(teacherToken))
      .expect(200);

    expect(response.body.enrollments).toHaveLength(1);
    expect(response.body.enrollments[0]).toMatchObject({
      courseId: course._id.toString(),
      courseTitle: 'Evaluación crítica',
      progress: expect.objectContaining({
        completion: 60,
        level: 'intermedio'
      })
    });

    expect(response.body.texts).toHaveLength(1);
    expect(response.body.texts[0]).toMatchObject({
      textId: text._id.toString(),
      title: 'Lectura crítica de editoriales',
      completed: true,
      lastPosition: 50,
      score: 85
    });
  });

  it('computes course metrics including enrollment averages and question stats', async () => {
    const { token: teacherToken, user: teacher } = await createTeacherAndLogin({
      email: 'metrics-teacher@example.com'
    });
    const { user: studentA } = await createStudentAndLogin({
      email: 'metrics-student-a@example.com'
    });
    const { user: studentB } = await createStudentAndLogin({
      email: 'metrics-student-b@example.com'
    });

    const course = await Course.create({
      title: 'Analítica de progreso',
      owner: teacher._id
    });

    await Enrollment.create({
      student: studentA._id,
      course: course._id,
      progress: { completion: 60, level: 'intermedio' }
    });
    await Enrollment.create({
      student: studentB._id,
      course: course._id,
      progress: { completion: 80, level: 'avanzado' }
    });

    const topic = await Topic.create({
      course: course._id,
      title: 'Evaluación de argumentos',
      order: 1,
      isPublished: true
    });

    const text = await Text.create({
      topic: topic._id,
      title: 'Argumentos complejos',
      content: 'Texto sobre el análisis de múltiples perspectivas.',
      source: 'Repositorio docente',
      estimatedTime: 12,
      difficulty: 'intermediate',
      length: 'medium'
    });

    const question = await Question.create({
      text: text._id,
      skill: 'inferencial',
      type: 'multiple-choice',
      prompt: '¿Cuál es la inferencia más sólida?',
      options: [
        { label: 'Respuesta A', isCorrect: true },
        { label: 'Respuesta B', isCorrect: false }
      ],
      feedbackTemplate: 'Revisa las evidencias presentadas.'
    });

    await QuestionAttempt.create({
      student: studentA._id,
      question: question._id,
      text: text._id,
      answers: [{ value: 'Respuesta A', isCorrect: true }],
      score: 80,
      completedAt: new Date('2024-02-01T12:00:00Z')
    });
    await QuestionAttempt.create({
      student: studentB._id,
      question: question._id,
      text: text._id,
      answers: [{ value: 'Respuesta B', isCorrect: false }],
      score: 60,
      completedAt: new Date('2024-02-02T12:00:00Z')
    });

    const response = await request(app)
      .get(`/api/progress/course/${course._id}/metrics`)
      .set(authHeader(teacherToken))
      .expect(200);

    expect(response.body.courseId).toBe(course._id.toString());
    expect(response.body.enrollmentMetrics.averageCompletion).toBeCloseTo(70);
    expect(response.body.enrollmentMetrics.levelDistribution).toEqual(
      expect.arrayContaining(['intermedio', 'avanzado'])
    );

    expect(response.body.questionMetrics).toHaveLength(1);
    const questionMetrics = response.body.questionMetrics[0];
    expect(questionMetrics._id).toBe(text._id.toString());
    expect(questionMetrics.averageScore).toBeCloseTo(70);
    expect(questionMetrics.attempts).toBe(2);
  });

  it('rejects student access to teacher-only progress dashboards', async () => {
    const { token: studentToken, user: student } = await createStudentAndLogin({
      email: 'progress-student-restricted@example.com'
    });

    const studentProgressResponse = await request(app)
      .get(`/api/progress/student/${student._id}`)
      .set(authHeader(studentToken))
      .expect(403);

    expect(studentProgressResponse.body.message).toBe('Permisos insuficientes');

    const fakeCourseId = student._id.toString();
    const courseMetricsResponse = await request(app)
      .get(`/api/progress/course/${fakeCourseId}/metrics`)
      .set(authHeader(studentToken))
      .expect(403);

    expect(courseMetricsResponse.body.message).toBe('Permisos insuficientes');
  });
});
