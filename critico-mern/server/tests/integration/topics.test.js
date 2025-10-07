const request = require('supertest');
const { app, createTeacherAndLogin, createStudentAndLogin } = require('../utils');
const Course = require('../../src/models/Course');
const Topic = require('../../src/models/Topic');
const ReadingProgress = require('../../src/models/ReadingProgress');

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('Topic management', () => {
  it('allows teachers to create, update and delete topics for their courses', async () => {
    const { token: teacherToken, user: teacher } = await createTeacherAndLogin({
      email: 'teacher-topic-owner@example.com'
    });

    const course = await Course.create({
      title: 'Pensamiento Crítico I',
      description: 'Fundamentos',
      owner: teacher._id,
      topicCount: 0
    });

    const createResponse = await request(app)
      .post(`/api/topics/course/${course._id}`)
      .set(authHeader(teacherToken))
      .send({
        title: 'Introducción al análisis de argumentos',
        description: 'Primer módulo del curso',
        order: 1,
        objectives: ['inference'],
        isPublished: true
      })
      .expect(201);

    const topicId = createResponse.body._id;
    expect(topicId).toBeDefined();
    expect(createResponse.body.title).toBe('Introducción al análisis de argumentos');

    const courseAfterCreate = await Course.findById(course._id);
    expect(courseAfterCreate.topicCount).toBe(1);

    const updateResponse = await request(app)
      .patch(`/api/topics/${topicId}`)
      .set(authHeader(teacherToken))
      .send({
        title: 'Análisis avanzado de argumentos',
        objectives: ['bias-detection'],
        order: 2
      })
      .expect(200);

    expect(updateResponse.body.title).toBe('Análisis avanzado de argumentos');
    expect(updateResponse.body.order).toBe(2);
    expect(updateResponse.body.objectives).toEqual(['bias-detection']);

    const { user: student } = await createStudentAndLogin({
      email: 'topic-student@example.com'
    });

    await ReadingProgress.create({
      student: student._id,
      topic: topicId,
      completed: true,
      score: 92
    });

    await request(app)
      .delete(`/api/topics/${topicId}`)
      .set(authHeader(teacherToken))
      .expect(204);

    const deletedTopic = await Topic.findById(topicId);
    expect(deletedTopic).toBeNull();

    const courseAfterDelete = await Course.findById(course._id);
    expect(courseAfterDelete.topicCount).toBe(0);

    const remainingProgress = await ReadingProgress.countDocuments({ topic: topicId });
    expect(remainingProgress).toBe(0);
  });

  it('rejects topic creation attempts from students', async () => {
    const { user: teacher } = await createTeacherAndLogin({
      email: 'topic-course-owner@example.com'
    });

    const course = await Course.create({
      title: 'Curso restringido',
      owner: teacher._id
    });

    const { token: studentToken } = await createStudentAndLogin({
      email: 'student-topic-forbidden@example.com'
    });

    const response = await request(app)
      .post(`/api/topics/course/${course._id}`)
      .set(authHeader(studentToken))
      .send({
        title: 'Tema bloqueado',
        order: 1
      })
      .expect(403);

    expect(response.body.message).toBe('Permisos insuficientes');
    expect(await Topic.countDocuments()).toBe(0);
  });
});
