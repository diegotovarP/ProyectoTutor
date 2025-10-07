process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const bcrypt = require('bcryptjs');
const { resetDatabase, createModel } = require('./support/inMemoryDb');
const mockCreateModel = createModel;

if (typeof jest !== 'undefined') {
  jest.mock('supertest', () => require('./support/apiClient'));
  jest.mock('helmet', () => () => (req, res, next) => next());
  jest.mock('cors', () => () => (req, res, next) => next());
  jest.mock('cookie-parser', () => () => (req, res, next) => next());
  jest.mock('morgan', () => () => (req, res, next) => next());
} else {
  require.cache[require.resolve('supertest')] = {
    id: 'supertest',
    filename: 'supertest',
    loaded: true,
    exports: require('./support/apiClient')
  };
  require.cache[require.resolve('helmet')] = {
    id: 'helmet',
    filename: 'helmet',
    loaded: true,
    exports: () => (req, res, next) => next()
  };
  require.cache[require.resolve('cors')] = {
    id: 'cors',
    filename: 'cors',
    loaded: true,
    exports: () => (req, res, next) => next()
  };
  require.cache[require.resolve('cookie-parser')] = {
    id: 'cookie-parser',
    filename: 'cookie-parser',
    loaded: true,
    exports: () => (req, res, next) => next()
  };
  require.cache[require.resolve('morgan')] = {
    id: 'morgan',
    filename: 'morgan',
    loaded: true,
    exports: () => (req, res, next) => next()
  };
}

const mockModel = (modulePath, mockName, mockOptions = {}) => {
  if (typeof jest !== 'undefined') {
    jest.mock(modulePath, () => mockCreateModel(mockName, mockOptions));
  } else {
    require.cache[require.resolve(modulePath)] = {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      exports: createModel(mockName, mockOptions)
    };
  }
};

mockModel('../src/models/User', 'User', {
  defaults: () => ({
    role: 'student',
    preferences: {
      language: 'es',
      theme: 'light',
      fontSize: 'medium',
      notifications: { email: true, push: true }
    }
  }),
  relations: { createdBy: { model: 'User' } },
  hooks: {
    async preSave(doc) {
      if (doc.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(doc.password, salt);
      }
    }
  },
  methods: {
    comparePassword(candidate) {
      return bcrypt.compare(candidate, this.password);
    }
  },
  transform(obj) {
    const sanitized = { ...obj };
    delete sanitized.password;
    delete sanitized.recoveryToken;
    delete sanitized.recoveryTokenExpiresAt;
    return sanitized;
  }
});

mockModel('../src/models/Course', 'Course', {
  defaults: () => ({
    description: '',
    topicCount: 0,
    status: 'draft',
    reminders: [],
    analytics: {
      averageScore: 0,
      totalTextsRead: 0,
      totalQuestionsAnswered: 0,
      biasTrends: []
    }
  }),
  relations: { owner: { model: 'User' } }
});

mockModel('../src/models/Topic', 'Topic', {
  defaults: () => ({
    order: 0,
    prerequisites: [],
    isPublished: false,
    objectives: [],
    recommendedFocus: []
  }),
  relations: { course: { model: 'Course' } }
});

mockModel('../src/models/Text', 'Text', {
  defaults: () => ({
    source: '',
    estimatedTime: 10,
    difficulty: 'beginner',
    length: 'medium',
    tags: [],
    content: '',
    order: 1,
    metadata: {},
    modePreferences: { hasDarkMode: true, hasFontResize: true },
    biasDetections: [],
    recommendations: []
  }),
  relations: { topic: { model: 'Topic' } }
});

mockModel('../src/models/Enrollment', 'Enrollment', {
  defaults: () => ({
    status: 'active',
    progress: {
      completion: 0,
      level: 'incipiente',
      lastAccessAt: null
    },
    notifications: { dueSoon: true, lastReminderSentAt: null }
  }),
  relations: {
    student: { model: 'User' },
    course: { model: 'Course' }
  }
});

mockModel('../src/models/ReadingProgress', 'ReadingProgress', {
  defaults: () => ({
    lastPosition: 0,
    completed: false,
    score: 0,
    lastMode: { theme: 'light', fontSize: 'medium' }
  }),
  relations: {
    student: { model: 'User' },
    course: { model: 'Course' },
    topic: { model: 'Topic' },
    text: { model: 'Text' }
  }
});

mockModel('../src/models/Question', 'Question', {
  defaults: () => ({
    type: 'multiple-choice',
    options: [],
    rubric: { criteria: [] },
    feedbackTemplate: ''
  }),
  relations: { text: { model: 'Text' } }
});

mockModel('../src/models/QuestionAttempt', 'QuestionAttempt', {
  defaults: () => ({
    answers: [],
    score: 0,
    timeSpentSeconds: 0,
    requiresReview: false
  }),
  relations: {
    student: { model: 'User' },
    question: { model: 'Question' },
    text: { model: 'Text' }
  }
});

mockModel('../src/models/Bias', 'Bias', {
  defaults: () => ({
    confidence: 0,
    severity: 'media',
    problematicWords: [],
    analyzedAt: new Date(),
    resolved: false
  }),
  relations: { analyzedBy: { model: 'User' } },
  statics: {
    async getStatistics(relatedTo, relatedId) {
      const biases = await this.find({ relatedTo, relatedId }).lean();
      const stats = {
        total: biases.length,
        byType: {},
        bySeverity: { alta: 0, media: 0, baja: 0 },
        averageConfidence: 0,
        resolved: 0,
        pending: 0
      };
      if (!biases.length) return stats;
      let totalConfidence = 0;
      biases.forEach((bias) => {
        const type = bias.type || 'desconocido';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        const severity = bias.severity || 'media';
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        totalConfidence += bias.confidence || 0;
        if (bias.resolved) {
          stats.resolved += 1;
        } else {
          stats.pending += 1;
        }
      });
      stats.averageConfidence = totalConfidence / biases.length;
      return stats;
    },
    async assessQuality(relatedTo, relatedId) {
      const stats = await this.getStatistics(relatedTo, relatedId);
      if (stats.total === 0) {
        return {
          level: 'excelente',
          score: 100,
          message: 'El texto muestra un excelente nivel de objetividad'
        };
      }
      let score = 100;
      score -= (stats.bySeverity.alta || 0) * 15;
      score -= (stats.bySeverity.media || 0) * 8;
      score -= (stats.bySeverity.baja || 0) * 3;
      score = Math.max(0, score);
      let level;
      let message;
      if (score >= 90) {
        level = 'excelente';
        message = 'El texto es muy objetivo con sesgos mínimos';
      } else if (score >= 75) {
        level = 'bueno';
        message = 'El texto es generalmente objetivo con algunos sesgos menores';
      } else if (score >= 60) {
        level = 'aceptable';
        message = 'El texto tiene varios sesgos que podrían mejorarse';
      } else if (score >= 40) {
        level = 'necesita mejoras';
        message = 'El texto contiene múltiples sesgos significativos';
      } else {
        level = 'problemático';
        message = 'El texto requiere revisión importante por sesgos graves';
      }
      return { level, score, message, stats };
    }
  }
});

mockModel('../src/models/AuditLog', 'AuditLog', {
  defaults: () => ({
    metadata: {},
    occurredAt: new Date()
  }),
  relations: { actor: { model: 'User' } }
});

mockModel('../src/models/BiasReport', 'BiasReport', {
  defaults: () => ({
    status: 'pending',
    confirmation: {}
  }),
  relations: {
    text: { model: 'Text' },
    topic: { model: 'Topic' },
    reportedBy: { model: 'User' }
  }
});

mockModel('../src/models/FeedbackMessage', 'FeedbackMessage', {
  defaults: () => ({
    feedback: '',
    resolved: false
  }),
  relations: {
    student: { model: 'User' },
    question: { model: 'Question' }
  }
});

mockModel('../src/models/Notification', 'Notification', {
  defaults: () => ({
    type: 'general',
    read: false
  }),
  relations: { user: { model: 'User' } }
});

mockModel('../src/models/Policy', 'Policy', {
  defaults: () => ({
    version: 1,
    clauses: []
  })
});

mockModel('../src/models/ReadingListItem', 'ReadingListItem', {
  defaults: () => ({
    status: 'pending'
  }),
  relations: {
    user: { model: 'User' },
    text: { model: 'Text' }
  }
});

mockModel('../src/models/Recommendation', 'Recommendation', {
  defaults: () => ({
    reason: '',
    priority: 'medium'
  }),
  relations: {
    student: { model: 'User' },
    text: { model: 'Text' }
  }
});

if (typeof afterEach === 'function') {
  afterEach(() => {
    resetDatabase();
  });
}
