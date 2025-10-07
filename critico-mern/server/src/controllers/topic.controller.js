const createError = require('http-errors');
const Topic = require('../models/Topic');
const Course = require('../models/Course');
const ReadingProgress = require('../models/ReadingProgress');

const getByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const topics = await Topic.find({ course: courseId }).sort({ order: 1 }).lean();
    const topicIds = topics.map((topic) => topic._id);

    const progress = await ReadingProgress.find({ student: req.user._id, topic: { $in: topicIds } }).lean();
    const completedTopics = new Set(progress.filter((item) => item.completed && item.topic).map((item) => item.topic.toString()));

    const response = topics.map((topic) => {
      const locked = topic.prerequisites?.length
        ? topic.prerequisites.some((id) => !completedTopics.has(id.toString()))
        : false;

      return {
        id: topic._id,
        title: topic.title,
        description: topic.description,
        order: topic.order,
        releaseDate: topic.releaseDate,
        dueDate: topic.dueDate,
        prerequisites: topic.prerequisites,
        isPublished: topic.isPublished,
        objectives: topic.objectives,
        locked
      };
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const createTopic = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      throw createError(404, 'Curso no encontrado');
    }

    const payload = {
      course: courseId,
      title: req.body.title,
      description: req.body.description,
      order: req.body.order || 1,
      releaseDate: req.body.releaseDate || undefined,
      dueDate: req.body.dueDate || undefined,
      objectives: req.body.objectives || [],
      prerequisites: req.body.prerequisites || [],
      isPublished: req.body.isPublished ?? true
    };

    const topic = await Topic.create(payload);

    if (typeof course.topicCount === 'number') {
      course.topicCount += 1;
      await course.save();
    }

    res.status(201).json(topic);
  } catch (error) {
    next(error);
  }
};

const ensureCoursePermission = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw createError(404, 'Curso no encontrado');
  }

  if (user.role === 'admin') {
    return course;
  }

  const isOwner = course.owner?.toString() === user._id.toString();
  const isCoTeacher = course.coTeachers?.some((id) => id.toString() === user._id.toString());

  if (!isOwner && !isCoTeacher) {
    throw createError(403, 'No tienes permisos sobre este curso');
  }

  return course;
};

const updateTopic = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      throw createError(403, 'Rol no autorizado');
    }

    const topic = await Topic.findById(req.params.topicId);
    if (!topic) {
      throw createError(404, 'Tema no encontrado');
    }

    await ensureCoursePermission(topic.course, req.user);

    const allowedFields = ['title', 'description', 'order', 'releaseDate', 'dueDate', 'objectives', 'prerequisites', 'isPublished'];
    allowedFields.forEach((field) => {
      if (typeof req.body[field] !== 'undefined') {
        topic[field] = req.body[field];
      }
    });

    await topic.save();
    res.status(200).json(topic);
  } catch (error) {
    next(error);
  }
};

const deleteTopic = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      throw createError(403, 'Rol no autorizado');
    }

    const topic = await Topic.findById(req.params.topicId);
    if (!topic) {
      throw createError(404, 'Tema no encontrado');
    }

    const course = await ensureCoursePermission(topic.course, req.user);

    await ReadingProgress.deleteMany({ topic: topic._id });

    await topic.deleteOne();

    if (typeof course.topicCount === 'number') {
      course.topicCount = Math.max(0, course.topicCount - 1);
      await course.save();
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getByCourse,
  createTopic,
  updateTopic,
  deleteTopic
};
