const authController = require('../../src/controllers/auth.controller');
const courseController = require('../../src/controllers/course.controller');
const topicController = require('../../src/controllers/topic.controller');
const textController = require('../../src/controllers/text.controller');
const questionController = require('../../src/controllers/question.controller');
const progressController = require('../../src/controllers/progress.controller');
const biasController = require('../../src/controllers/bias.controller');
const { authenticate, authorize } = require('../../src/middlewares/auth');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const normalizeHeaders = (headers = {}) => {
  const normalized = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (!key) return;
    normalized[key.toLowerCase()] = value;
  });
  return normalized;
};

const routes = [
  { method: 'POST', pattern: /^\/api\/auth\/register$/i, handler: authController.register },
  { method: 'POST', pattern: /^\/api\/auth\/login$/i, handler: authController.login },
  { method: 'POST', pattern: /^\/api\/auth\/forgot-password$/i, handler: authController.forgotPassword },

  { method: 'POST', pattern: /^\/api\/courses$/i, handler: courseController.createCourse, middlewares: [authenticate, authorize('teacher', 'admin')] },
  { method: 'GET', pattern: /^\/api\/courses\/mine$/i, handler: courseController.getMyCourses, middlewares: [authenticate] },

  { method: 'GET', pattern: /^\/api\/topics\/course\/(?<courseId>[^/]+)$/i, handler: topicController.getByCourse, middlewares: [authenticate] },
  { method: 'POST', pattern: /^\/api\/topics\/course\/(?<courseId>[^/]+)$/i, handler: topicController.createTopic, middlewares: [authenticate, authorize('teacher', 'admin')] },
  { method: 'PATCH', pattern: /^\/api\/topics\/(?<topicId>[^/]+)$/i, handler: topicController.updateTopic, middlewares: [authenticate, authorize('teacher', 'admin')] },
  { method: 'DELETE', pattern: /^\/api\/topics\/(?<topicId>[^/]+)$/i, handler: topicController.deleteTopic, middlewares: [authenticate, authorize('teacher', 'admin')] },

  { method: 'GET', pattern: /^\/api\/texts\/topic\/(?<topicId>[^/]+)$/i, handler: textController.getByTopic, middlewares: [authenticate] },

  { method: 'POST', pattern: /^\/api\/questions\/text\/(?<textId>[^/]+)\/submit$/i, handler: questionController.submitAnswers, middlewares: [authenticate] },

  { method: 'GET', pattern: /^\/api\/progress\/student\/(?<studentId>[^/]+)$/i, handler: progressController.getStudentProgress, middlewares: [authenticate, authorize('teacher', 'admin')] },
  { method: 'GET', pattern: /^\/api\/progress\/course\/(?<courseId>[^/]+)\/metrics$/i, handler: progressController.getCourseMetrics, middlewares: [authenticate, authorize('teacher', 'admin')] },

  { method: 'POST', pattern: /^\/api\/bias\/analyze-content$/i, handler: biasController.analyzeTextContent, middlewares: [authenticate] },
  { method: 'GET', pattern: /^\/api\/bias\/(?<relatedTo>[^/]+)\/(?<relatedId>[^/]+)$/i, handler: biasController.getBiases, middlewares: [authenticate] },
  { method: 'POST', pattern: /^\/api\/bias\/analyze-text\/(?<textId>[^/]+)$/i, handler: biasController.analyzeText, middlewares: [authenticate] },
  { method: 'POST', pattern: /^\/api\/bias\/analyze-attempt\/(?<attemptId>[^/]+)$/i, handler: biasController.analyzeAttempt, middlewares: [authenticate] }
];

const findRoute = (method, path) => {
  return routes.find((route) => route.method === method && route.pattern.test(path));
};

const runMiddleware = (fn, req, res) => {
  return new Promise((resolve, reject) => {
    const next = (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
};

const sanitizePayload = (payload) => {
  if (payload === undefined || payload === null) {
    return payload;
  }
  if (typeof payload === 'object') {
    return JSON.parse(JSON.stringify(payload));
  }
  return payload;
};

const createResponse = () => {
  const headers = {};
  const res = {
    statusCode: 200,
    headers,
    body: undefined,
    sent: false,
    set(field, value) {
      headers[String(field).toLowerCase()] = value;
      return res;
    },
    setHeader(field, value) {
      return res.set(field, value);
    },
    getHeader(field) {
      return headers[String(field).toLowerCase()];
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      if (!res.getHeader('content-type')) {
        res.set('content-type', 'application/json');
      }
      res.body = sanitizePayload(payload);
      res.sent = true;
      return res;
    },
    send(payload) {
      res.body = typeof payload === 'object' ? sanitizePayload(payload) : payload;
      res.sent = true;
      return res;
    },
    end(payload) {
      if (payload !== undefined) {
          res.body = typeof payload === 'object' ? sanitizePayload(payload) : payload;
      }
      res.sent = true;
      return res;
    }
  };
  return res;
};

const formatResult = (res) => {
  const text = typeof res.body === 'string' ? res.body : (res.body ? JSON.stringify(res.body) : '');
  return {
    status: res.statusCode,
    body: res.body,
    text,
    headers: { ...res.headers }
  };
};

const executeRequest = async ({ method, path, headers = {}, body, query }) => {
  const normalizedMethod = method.toUpperCase();
  const route = findRoute(normalizedMethod, path);
  if (!route) {
    throw new Error(`No test route handler defined for ${method} ${path}`);
  }

  const match = route.pattern.exec(path);
  const params = (match && match.groups) || {};

  const normalizedHeaders = normalizeHeaders(headers);

  const req = {
    method: normalizedMethod,
    path,
    originalUrl: path,
    headers: normalizedHeaders,
    body,
    query: query || {},
    params,
    app: {},
    res: null,
    get(name) {
      return normalizedHeaders[String(name || '').toLowerCase()];
    }
  };

  const res = createResponse();
  req.res = res;

  try {
    if (route.middlewares) {
      for (const middleware of route.middlewares) {
        await runMiddleware(middleware, req, res);
        if (res.sent) {
          return formatResult(res);
        }
      }
    }

    await runMiddleware(route.handler, req, res);
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || 'Error interno del servidor';
    res.status(status).json({
      message,
      details: error.errors || undefined
    });
  }

  if (!res.sent) {
    res.status(200).send('');
  }

  return formatResult(res);
};

class RequestBuilder {
  constructor() {
    this.method = 'GET';
    this.path = '/';
    this.headers = {};
    this.payload = undefined;
    this.queryParams = undefined;
    this.expectations = [];
    this._promise = null;
  }

  set(field, value) {
    if (typeof field === 'string') {
      this.headers[field] = value;
    } else if (field && typeof field === 'object') {
      Object.assign(this.headers, field);
    }
    return this;
  }

  query(params) {
    this.queryParams = { ...(this.queryParams || {}), ...(params || {}) };
    return this;
  }

  send(body) {
    this.payload = body;
    return this;
  }

  expect(status, body) {
    this.expectations.push({ type: 'status', value: status });
    if (body !== undefined) {
      this.expectations.push({ type: 'body', value: body });
    }
    return this._execute();
  }

  then(onFulfilled, onRejected) {
    return this._execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this._execute().catch(onRejected);
  }

  _execute() {
    if (!this._promise) {
      this._promise = executeRequest({
        method: this.method,
        path: this.path,
        headers: this.headers,
        body: this.payload,
        query: this.queryParams
      }).then((result) => {
        for (const expectation of this.expectations) {
          if (expectation.type === 'status') {
            const expectedStatuses = Array.isArray(expectation.value) ? expectation.value : [expectation.value];
            if (!expectedStatuses.includes(result.status)) {
              throw new Error(`Expected status ${expectedStatuses.join(' or ')}, received ${result.status}`);
            }
          } else if (expectation.type === 'body') {
            const expected = JSON.stringify(expectation.value);
            const actual = JSON.stringify(result.body);
            if (expected !== actual) {
              throw new Error(`Expected body ${expected}, received ${actual}`);
            }
          }
        }
        return result;
      });
    }
    return this._promise;
  }
}

METHODS.forEach((method) => {
  RequestBuilder.prototype[method] = function setMethod(path) {
    this.method = method.toUpperCase();
    this.path = path;
    return this;
  };
});

const createRequest = () => new RequestBuilder();
createRequest.agent = createRequest;

module.exports = () => createRequest();
