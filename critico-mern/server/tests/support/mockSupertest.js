const http = require('http');
const { PassThrough } = require('stream');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const normalizeHeaders = (headers = {}) => {
  const normalized = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (!key) return;
    normalized[key.toLowerCase()] = value;
  });
  return normalized;
};

const createServer = (app) => {
  if (!app.__mockServer) {
    app.__mockServer = http.createServer(app);
  }
  return app.__mockServer;
};

class RequestBuilder {
  constructor(app) {
    this.app = app;
    this.method = 'get';
    this.path = '/';
    this.headers = {};
    this.payload = undefined;
    this.queryParams = undefined;
    this.expectations = [];
    this._promise = null;
  }

  set(field, value) {
    if (typeof field === 'string') {
      this.headers[field.toLowerCase()] = value;
    } else if (field && typeof field === 'object') {
      Object.assign(this.headers, normalizeHeaders(field));
    }
    return this;
  }

  query(params) {
    this.queryParams = { ...(this.queryParams || {}), ...(params || {}) };
    return this;
  }

  send(body) {
    this.payload = body;
    if (body !== null && body !== undefined && typeof body === 'object' && !Buffer.isBuffer(body)) {
      if (!this.headers['content-type']) {
        this.headers['content-type'] = 'application/json';
      }
    }
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
      this._promise = this._runRequest();
    }
    return this._promise;
  }

  async _runRequest() {
    const app = this.app;
    const method = this.method.toUpperCase();
    const headers = normalizeHeaders(this.headers);
    const query = this.queryParams ? new URLSearchParams(this.queryParams).toString() : '';
    const url = query ? `${this.path}?${query}` : this.path;

    let bodyBuffer;
    if (this.payload !== undefined) {
      if (Buffer.isBuffer(this.payload)) {
        bodyBuffer = this.payload;
      } else if (typeof this.payload === 'string') {
        bodyBuffer = Buffer.from(this.payload);
      } else {
        bodyBuffer = Buffer.from(JSON.stringify(this.payload));
        headers['content-type'] = headers['content-type'] || 'application/json';
      }
      headers['content-length'] = String(bodyBuffer.length);
    }

    const requestStream = new PassThrough();
    const req = new http.IncomingMessage(requestStream);
    req.method = method;
    req.url = url;
    req.headers = headers;
    req.connection = req.socket = requestStream;
    requestStream.on('end', () => {
      // noop placeholder for debugging
    });

    if (bodyBuffer) {
      requestStream.end(bodyBuffer);
    } else {
      requestStream.end();
    }

    const responseStream = new PassThrough();
    const res = new http.ServerResponse(req);
    res.assignSocket(responseStream);
    responseStream.resume();

    let rawData = Buffer.alloc(0);
    responseStream.on('data', (chunk) => {
      rawData = Buffer.concat([rawData, chunk]);
    });

    const server = createServer(app);

    const result = await new Promise((resolve, reject) => {
      res.on('error', reject);

      res.on('finish', () => {
        const text = rawData.toString('utf8');
        const contentType = res.getHeader('content-type');
        let body = text;
        if (contentType && typeof contentType === 'string' && contentType.includes('application/json')) {
          try {
            body = text ? JSON.parse(text) : {};
          } catch (error) {
            body = text;
          }
        }
        resolve({
          status: res.statusCode,
          body,
          text,
          headers: res.getHeaders()
        });
      });

      server.emit('request', req, res);
    });

    for (const expectation of this.expectations) {
      if (expectation.type === 'status') {
        const expected = Array.isArray(expectation.value) ? expectation.value : [expectation.value];
        if (!expected.includes(result.status)) {
          throw new Error(`Expected status ${expected.join(' or ')}, received ${result.status}`);
        }
      } else if (expectation.type === 'body') {
        const expectedString = JSON.stringify(expectation.value);
        const actualString = JSON.stringify(result.body);
        if (expectedString !== actualString) {
          throw new Error(`Expected body ${expectedString}, received ${actualString}`);
        }
      }
    }

    return result;
  }
}

METHODS.forEach((method) => {
  RequestBuilder.prototype[method] = function setMethod(path) {
    this.method = method;
    this.path = path;
    return this;
  };
});

const createRequest = (app) => new RequestBuilder(app);
createRequest.agent = createRequest;

module.exports = createRequest;
