const request = require('supertest');
const mongoose = require('mongoose');
const { app, createStudentAndLogin, createTeacherAndLogin, findUser } = require('../utils');
const Course = require('../../src/models/Course');
const Enrollment = require('../../src/models/Enrollment');
const Topic = require('../../src/models/Topic');
const Text = require('../../src/models/Text');
const Question = require('../../src/models/Question');
const ReadingProgress = require('../../src/models/ReadingProgress');

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('Learning flows', () => {
  it('returns my courses with progress and reminders', async () => {
    const { token: teacherToken, user: teacher } = await createTeacherAndLogin({ email: 'doc@example.com' });
    const courseResponse = await request(app)
      .post('/api/courses')
      .set(authHeader(teacherToken))
      .send({
        title: 'Análisis Argumentativo',
        description: 'Curso de pensamiento crítico',
        reminders: [{ dueDate: new Date().toISOString(), type: 'due_soon' }]
      })
      .expect(201);

    const { user: student, token: studentToken } = await createStudentAndLogin({ email: 'student1@example.com' });
    await Enrollment.create({
      student: student._id,
      course: courseResponse.body._id,
      progress: { completion: 45, level: 'basico' }
    });

    const response = await request(app)
      .get('/api/courses/mine')
      .set(authHeader(studentToken))
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].progress).toBe(45);
    expect(response.body[0].dueSoon).toBeDefined();
  });

  it('lists topics with lock status and text filters', async () => {
    const { user: teacher, token: teacherToken } = await createTeacherAndLogin({ email: 'doc2@example.com' });
    const course = await Course.create({ title: 'Sesgos Cognitivos', owner: teacher._id, isPublished: true });

    const topic1 = await Topic.create({
      course: course._id,
      title: 'Introducción',
      order: 1,
      isPublished: true
    });
    const topic2 = await Topic.create({
      course: course._id,
      title: 'Sesgo de confirmación',
      order: 2,
      prerequisites: [topic1._id],
      isPublished: true
    });

    const text1 = await Text.create({
      topic: topic2._id,
      title: 'Artículo largo',
      source: 'Revista X',
      estimatedTime: 15,
      difficulty: 'intermediate',
      length: 'long',
      tags: ['sesgo', 'confirmacion'],
      content: 'Contenido del texto',
      biasDetections: [{ type: 'confirmacion', excerpt: 'Ejemplo', explanation: 'Explicación' }]
    });

    const { token: studentToken, user: student } = await createStudentAndLogin({ email: 'student2@example.com' });

    await Enrollment.create({ student: student._id, course: course._id });
    await ReadingProgress.create({ student: student._id, topic: topic1._id, completed: true });

    const topicsResponse = await request(app)
      .get(`/api/topics/course/${course._id}`)
      .set(authHeader(studentToken))
      .expect(200);

    expect(topicsResponse.body[1].locked).toBe(false);

    const textsResponse = await request(app)
      .get(`/api/texts/topic/${topic2._id}`)
      .query({ length: 'long' })
      .set(authHeader(studentToken))
      .expect(200);

    expect(textsResponse.body[0].title).toBe(text1.title);
  });

  it('generates scores and feedback when submitting answers', async () => {
    const { user: teacher } = await createTeacherAndLogin({ email: 'doc3@example.com' });
    const course = await Course.create({ title: 'Preguntas críticas', owner: teacher._id });
    const topic = await Topic.create({ course: course._id, title: 'Inferencias', order: 1, isPublished: true });
    const text = await Text.create({
      topic: topic._id,
      title: 'Texto inferencias',
      source: 'Fuente Y',
      estimatedTime: 10,
      difficulty: 'beginner',
      length: 'short',
      content: 'Contenido',
      biasDetections: []
    });

    const question = await Question.create({
      text: text._id,
      skill: 'inferencial',
      type: 'multiple-choice',
      prompt: '¿Cuál es la inferencia correcta?',
      options: [
        { label: 'Respuesta A', isCorrect: true },
        { label: 'Respuesta B', isCorrect: false }
      ],
      feedbackTemplate: 'Recuerda revisar el párrafo 2'
    });

    const { token: studentToken, user: student } = await createStudentAndLogin({ email: 'student3@example.com' });
    await Enrollment.create({ student: student._id, course: course._id });

    const response = await request(app)
      .post(`/api/questions/text/${question.text}/submit`)
      .set(authHeader(studentToken))
      .send({
        responses: [
          {
            questionId: question._id.toString(),
            answer: 'Respuesta A',
            timeSpentSeconds: 30
          }
        ]
      })
      .expect(201);

    expect(response.body.totalScore).toBe(1);
    expect(response.body.feedback[0].autoFeedback).toContain('Recuerda');
  });
});
