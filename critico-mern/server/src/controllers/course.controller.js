const createError = require('http-errors');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const Enrollment = require('../models/Enrollment');

const mapCourseResponse = (course) => ({
  id: course._id,
  title: course.title,
  description: course.description,
  progress: course.progress ?? 0,
  level: course.level ?? 'incipiente',
  dueSoon: course.dueSoon ?? null,
  owner: course.ownerName ?? null
});

const getMyCourses = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      const enrollments = await Enrollment.find({ student: req.user._id })
        .populate({ path: 'course', populate: { path: 'owner', select: 'firstName lastName' } })
        .lean();

      const response = enrollments.map((enrollment) => {
        const course = enrollment.course;
        const due = course?.reminders?.find((r) => r.type === 'due_soon');
        return mapCourseResponse({
          _id: course?._id,
          title: course?.title,
          description: course?.description,
          progress: enrollment.progress?.completion || 0,
          level: enrollment.progress?.level || 'incipiente',
          dueSoon: due ? {
            dueDate: due.dueDate,
            type: due.type
          } : null,
          ownerName: course?.owner ? `${course.owner.firstName} ${course.owner.lastName}` : null
        });
      });

      return res.status(200).json(response);
    }

    const courseFilter = req.user.role === 'teacher'
      ? { $or: [{ owner: req.user._id }, { coTeachers: req.user._id }] }
      : {};

    const courses = await Course.find(courseFilter)
      .populate('owner', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const response = courses.map((course) => {
      const due = course.reminders?.find((r) => r.type === 'due_soon');
      return mapCourseResponse({
        ...course,
        progress: course.analytics?.averageScore || 0,
        level: course.objectives?.[0] || 'intermedio',
        dueSoon: due ? {
          dueDate: due.dueDate,
          type: due.type
        } : null,
        ownerName: course.owner ? `${course.owner.firstName} ${course.owner.lastName}` : null
      });
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate('owner', 'firstName lastName')
      .lean();
    
    if (!course) {
      throw createError(404, 'Curso no encontrado');
    }

    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({ 
        student: req.user._id, 
        course: course._id 
      });
      if (!enrollment) {
        throw createError(403, 'No tienes acceso a este curso');
      }
    } else if (req.user.role === 'teacher') {
      const isOwner = course.owner._id.toString() === req.user._id.toString();
      const isCoTeacher = course.coTeachers?.some((id) => id.toString() === req.user._id.toString());
      if (!isOwner && !isCoTeacher) {
        throw createError(403, 'No tienes permisos sobre este curso');
      }
    }

    const due = course.reminders?.find((r) => r.type === 'due_soon');
    const response = mapCourseResponse({
      ...course,
      progress: course.analytics?.averageScore || 0,
      level: course.objectives?.[0] || 'intermedio',
      dueSoon: due ? {
        dueDate: due.dueDate,
        type: due.type
      } : null,
      ownerName: course.owner ? `${course.owner.firstName} ${course.owner.lastName}` : null
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      throw createError(403, 'Solo docentes pueden crear cursos');
    }
    const course = await Course.create({ ...req.body, owner: req.user._id });
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

const ensureCoursePermission = (course, user) => {
  if (!course) {
    throw createError(404, 'Curso no encontrado');
  }

  if (user.role === 'admin') {
    return;
  }

  const isOwner = course.owner?.toString() === user._id.toString();
  const isCoTeacher = course.coTeachers?.some((id) => id.toString() === user._id.toString());

  if (!isOwner && !isCoTeacher) {
    throw createError(403, 'No tienes permisos sobre este curso');
  }
};

const updateCourse = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      throw createError(403, 'Rol no autorizado');
    }

    const course = await Course.findById(req.params.courseId);
    ensureCoursePermission(course, req.user);

    const allowedFields = ['title', 'description', 'objectives', 'status', 'reminders', 'startDate', 'endDate', 'tags'];
    allowedFields.forEach((field) => {
      if (typeof req.body[field] !== 'undefined') {
        course[field] = req.body[field];
      }
    });

    await course.save();
    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      throw createError(403, 'Rol no autorizado');
    }

    const course = await Course.findById(req.params.courseId);
    ensureCoursePermission(course, req.user);

    await Topic.deleteMany({ course: course._id });
    await Enrollment.deleteMany({ course: course._id });
    await course.deleteOne();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getAvailableCourses = async (req, res, next) => {
  try {

    if (req.user.role !== 'student') {
      throw createError(403, 'Solo estudiantes pueden acceder a esta función');
    }

    const enrollments = await Enrollment.find({ 
      student: req.user._id 
    }).select('course').lean();
    
    const enrolledCourseIds = enrollments.map(e => e.course.toString());

    const availableCourses = await Course.find({
      _id: { $nin: enrolledCourseIds }
    })
      .populate('owner', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const response = availableCourses.map((course) => ({
      id: course._id,
      title: course.title,
      description: course.description,
      owner: course.owner ? `${course.owner.firstName} ${course.owner.lastName}` : 'Sin instructor',
      objectives: course.objectives || [],
      startDate: course.startDate,
      endDate: course.endDate,
      tags: course.tags || [],
      createdAt: course.createdAt
    }));

    res.status(200).json({
      success: true,
      courses: response
    });
  } catch (error) {
    next(error);
  }
};

const getEnrolledCourses = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      throw createError(403, 'Solo estudiantes pueden acceder a esta función');
    }

    const enrollments = await Enrollment.find({ 
      student: req.user._id,
      status: 'active'
    })
      .populate({
        path: 'course',
        populate: { path: 'owner', select: 'firstName lastName' }
      })
      .lean();

    const response = enrollments.map((enrollment) => {
      const course = enrollment.course;
      return {
        id: course._id,
        title: course.title,
        description: course.description,
        owner: course.owner ? `${course.owner.firstName} ${course.owner.lastName}` : 'Sin instructor',
        progress: enrollment.progress.completion || 0,
        level: enrollment.progress.level || 'incipiente',
        lastAccessAt: enrollment.progress.lastAccessAt,
        enrolledAt: enrollment.createdAt
      };
    });

    res.status(200).json({
      success: true,
      courses: response
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getAvailableCourses,
  getEnrolledCourses
};
