const mongoose = require('mongoose');
const { Types } = mongoose;

const registry = new Map();

const isObjectId = (value) => value instanceof Types.ObjectId;

const toObjectId = (value) => {
  if (isObjectId(value)) {
    return value;
  }
  if (value && typeof value === 'object' && '_id' in value) {
    return toObjectId(value._id);
  }
  if (value === undefined || value === null || value === '') {
    return value;
  }
  try {
    return new Types.ObjectId(value);
  } catch (error) {
    return value;
  }
};

const cloneDoc = (value) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneDoc);
  }
  if (value instanceof Date) {
    return new Date(value);
  }
  if (isObjectId(value)) {
    return toObjectId(value);
  }
  if (typeof value === 'object') {
    const result = {};
    Object.keys(value).forEach((key) => {
      if (key.startsWith('__')) return;
      result[key] = cloneDoc(value[key]);
    });
    return result;
  }
  return value;
};

const getValue = (obj, path) => {
  if (!path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
};

const setValue = (obj, path, value) => {
  const parts = path.split('.');
  let current = obj;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  });
};

const equals = (left, right) => {
  if (left === right) return true;
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }
  const normalize = (value) => {
    if (isObjectId(value)) return value.toString();
    if (typeof value === 'object' && value._id) return normalize(value._id);
    return value;
  };
  return normalize(left) === normalize(right);
};

const matchesCondition = (value, condition) => {
  if (condition === undefined) return true;
  if (condition && typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof Date) && !isObjectId(condition)) {
    if ('$in' in condition) {
      return condition.$in.some((item) => equals(value, item));
    }
    if ('$nin' in condition) {
      return !condition.$nin.some((item) => equals(value, item));
    }
    if ('$exists' in condition) {
      const exists = value !== undefined && value !== null;
      return condition.$exists ? exists : !exists;
    }
    if ('$gte' in condition || '$lte' in condition || '$gt' in condition || '$lt' in condition) {
      if (value === undefined || value === null) return false;
      if ('$gte' in condition && !(value >= condition.$gte)) return false;
      if ('$lte' in condition && !(value <= condition.$lte)) return false;
      if ('$gt' in condition && !(value > condition.$gt)) return false;
      if ('$lt' in condition && !(value < condition.$lt)) return false;
      return true;
    }
    if ('$eq' in condition) {
      return equals(value, condition.$eq);
    }
  }
  return equals(value, condition);
};

const matchesFilter = (doc, filter = {}) => {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or' && Array.isArray(condition)) {
      return condition.some((sub) => matchesFilter(doc, sub));
    }
    if (key === '$and' && Array.isArray(condition)) {
      return condition.every((sub) => matchesFilter(doc, sub));
    }
    const value = getValue(doc, key);
    return matchesCondition(value, condition);
  });
};

const applySelect = (doc, select) => {
  if (!select) return doc;
  const fields = Array.isArray(select)
    ? select
    : select
      .split(' ')
      .map((field) => field.trim())
      .filter(Boolean);
  if (!fields.length) return doc;
  const result = {};
  fields.forEach((field) => {
    if (field === '-_id') return;
    if (field.startsWith('-')) return;
    const value = doc[field];
    if (value !== undefined) {
      result[field] = cloneDoc(value);
    }
  });
  if (!fields.includes('_id') && doc._id !== undefined) {
    result._id = cloneDoc(doc._id);
  }
  return result;
};

const sortDocuments = (docs, sort) => {
  if (!sort) return docs;
  const sortEntries = Object.entries(sort);
  return docs.slice().sort((a, b) => {
    for (const [key, direction] of sortEntries) {
      const left = getValue(a, key);
      const right = getValue(b, key);
      if (equals(left, right)) continue;
      const comparison = left > right ? 1 : -1;
      return direction >= 0 ? comparison : -comparison;
    }
    return 0;
  });
};

const populateDocument = (doc, populateSpecs, model) => {
  if (!populateSpecs || !populateSpecs.length) return doc;
  return populateSpecs.reduce((currentDoc, specRaw) => {
    const spec = typeof specRaw === 'string' ? { path: specRaw } : specRaw;
    const relation = model.relations?.[spec.path];
    if (!relation) {
      return currentDoc;
    }
    const targetModel = registry.get(relation.model);
    if (!targetModel) return currentDoc;

    const value = currentDoc[spec.path];
    if (value === undefined || value === null) return currentDoc;

    const populateValue = (ref) => {
      const id = ref && ref._id ? ref._id : ref;
      const record = targetModel.store.find((item) => equals(item._id, id));
      if (!record) return null;
      let result = cloneDoc(record);
      if (spec.select) {
        result = applySelect(result, spec.select);
      }
      if (spec.populate) {
        const nestedSpecs = Array.isArray(spec.populate) ? spec.populate : [spec.populate];
        result = populateDocument(result, nestedSpecs, targetModel);
      }
      return result;
    };

    if (Array.isArray(value)) {
      currentDoc[spec.path] = value.map(populateValue).filter((item) => item !== null);
    } else {
      currentDoc[spec.path] = populateValue(value);
    }

    return currentDoc;
  }, doc);
};

class InMemoryQuery {
  constructor(model, filter = {}) {
    this.model = model;
    this.filter = filter;
    this._populate = [];
    this._select = null;
    this._sort = null;
    this._lean = false;
    this._limit = null;
    this._skip = 0;
  }

  populate(path, select) {
    if (typeof path === 'string') {
      this._populate.push(select ? { path, select } : { path });
    } else if (path) {
      this._populate.push(path);
    }
    return this;
  }

  sort(sort) {
    this._sort = sort;
    return this;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  limit(value) {
    this._limit = value;
    return this;
  }

  skip(value) {
    this._skip = value;
    return this;
  }

  async exec() {
    let docs = this.model.store.filter((doc) => matchesFilter(doc, this.filter)).map(cloneDoc);

    if (this._sort) {
      docs = sortDocuments(docs, this._sort);
    }

    if (this._skip) {
      docs = docs.slice(this._skip);
    }

    if (this._limit !== null && this._limit !== undefined) {
      docs = docs.slice(0, this._limit);
    }

    if (this._populate.length) {
      docs = docs.map((doc) => populateDocument(doc, this._populate, this.model));
    }

    if (this._select) {
      docs = docs.map((doc) => applySelect(doc, this._select));
    }

    if (this._lean) {
      return docs;
    }

    return docs.map((doc) => this.model._hydrate(doc));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

const runAggregate = (model, pipeline = []) => {
  let data = model.store.map(cloneDoc);

  const getGroupId = (doc, idSpec) => {
    if (typeof idSpec === 'string' && idSpec.startsWith('$')) {
      return cloneDoc(getValue(doc, idSpec.slice(1)));
    }
    return cloneDoc(idSpec);
  };

  pipeline.forEach((stage) => {
    const [[operator, argument]] = Object.entries(stage);
    switch (operator) {
      case '$match':
        data = data.filter((doc) => matchesFilter(doc, argument));
        break;
      case '$sort':
        data = sortDocuments(data, argument);
        break;
      case '$limit':
        data = data.slice(0, argument);
        break;
      case '$group': {
        const accumulators = Object.entries(argument).filter(([key]) => key !== '_id');
        const groups = new Map();
        data.forEach((doc) => {
          const groupId = getGroupId(doc, argument._id);
          const groupKey = JSON.stringify(groupId);
          if (!groups.has(groupKey)) {
            const initial = { _id: groupId };
            accumulators.forEach(([field, expr]) => {
              if ('$avg' in expr) {
                initial[field] = { type: 'avg', sum: 0, count: 0, path: expr.$avg };
              } else if ('$sum' in expr) {
                initial[field] = { type: 'sum', sum: 0, value: expr.$sum };
              } else if ('$push' in expr) {
                initial[field] = { type: 'push', values: [], path: expr.$push };
              }
            });
            groups.set(groupKey, initial);
          }
          const group = groups.get(groupKey);
          accumulators.forEach(([field, expr]) => {
            const accumulator = group[field];
            if (!accumulator) return;
            if (accumulator.type === 'avg') {
              const path = typeof accumulator.path === 'string' && accumulator.path.startsWith('$')
                ? accumulator.path.slice(1)
                : accumulator.path;
              const value = Array.isArray(path) ? path : getValue(doc, path);
              if (typeof value === 'number') {
                accumulator.sum += value;
                accumulator.count += 1;
              }
            } else if (accumulator.type === 'sum') {
              if (typeof accumulator.value === 'number') {
                accumulator.sum += accumulator.value;
              } else if (typeof accumulator.value === 'string' && accumulator.value.startsWith('$')) {
                const val = getValue(doc, accumulator.value.slice(1));
                if (typeof val === 'number') {
                  accumulator.sum += val;
                }
              }
            } else if (accumulator.type === 'push') {
              const path = typeof accumulator.path === 'string' && accumulator.path.startsWith('$')
                ? accumulator.path.slice(1)
                : accumulator.path;
              const value = getValue(doc, path);
              accumulator.values.push(cloneDoc(value));
            }
          });
        });
        data = Array.from(groups.values()).map((group) => {
          const result = { _id: group._id };
          accumulators.forEach(([field]) => {
            const accumulator = group[field];
            if (accumulator.type === 'avg') {
              result[field] = accumulator.count > 0 ? accumulator.sum / accumulator.count : null;
            } else if (accumulator.type === 'sum') {
              result[field] = accumulator.sum;
            } else if (accumulator.type === 'push') {
              result[field] = accumulator.values;
            }
          });
          return result;
        });
        break;
      }
      default:
        throw new Error(`Unsupported aggregate operator: ${operator}`);
    }
  });

  return data;
};

const buildDocumentClass = (modelName, store, options) => {
  class InMemoryDocument {
    constructor(data = {}, { isNew = true } = {}) {
      this.__modelName = modelName;
      this.__isNew = isNew;
      this.__store = store;
      this.__options = options;
      const defaults = typeof options.defaults === 'function'
        ? options.defaults()
        : cloneDoc(options.defaults || {});
      const payload = { ...defaults, ...cloneDoc(data) };

      if (!payload._id) {
        payload._id = new Types.ObjectId();
      } else {
        payload._id = toObjectId(payload._id);
      }

      const now = new Date();
      payload.createdAt = payload.createdAt ? new Date(payload.createdAt) : now;
      payload.updatedAt = payload.updatedAt ? new Date(payload.updatedAt) : now;

      Object.assign(this, payload);
      this.__original = cloneDoc(payload);
    }

    isModified(path) {
      if (this.__isNew) return true;
      if (!path) return true;
      const current = getValue(this, path);
      const original = getValue(this.__original, path);
      return !equals(current, original);
    }

    markModified() {
      // No-op for compatibility
    }

    toObject() {
      return cloneDoc(this);
    }

    toJSON() {
      let obj = this.toObject();
      if (typeof this.__options.transform === 'function') {
        obj = this.__options.transform(obj);
      }
      return obj;
    }

    async save() {
      if (this.__options?.hooks?.preSave) {
        await this.__options.hooks.preSave(this);
      }

      const existingIndex = this.__store.findIndex((doc) => equals(doc._id, this._id));
      const now = new Date();
      this.updatedAt = now;
      const plain = this.toObject();
      plain.updatedAt = now;
      if (existingIndex === -1) {
        plain.createdAt = now;
        this.createdAt = now;
        this.__store.push(plain);
      } else {
        this.createdAt = this.__store[existingIndex].createdAt || this.createdAt || now;
        plain.createdAt = this.createdAt;
        this.__store[existingIndex] = plain;
      }
      this.__original = cloneDoc(plain);
      this.__isNew = false;
      return this;
    }

    async deleteOne() {
      const index = this.__store.findIndex((doc) => equals(doc._id, this._id));
      if (index !== -1) {
        this.__store.splice(index, 1);
      }
    }
  }

  if (options.methods) {
    Object.entries(options.methods).forEach(([name, fn]) => {
      InMemoryDocument.prototype[name] = fn;
    });
  }

  return InMemoryDocument;
};

const createModel = (modelName, options = {}) => {
  if (registry.has(modelName)) {
    return registry.get(modelName);
  }

  const store = [];
  const DocumentClass = buildDocumentClass(modelName, store, options);

  class InMemoryModel {
    static modelName = modelName;
    static store = store;
    static relations = options.relations || {};
    static DocumentClass = DocumentClass;

    static _hydrate(doc) {
      return new DocumentClass(doc, { isNew: false });
    }

    static async create(doc) {
      if (Array.isArray(doc)) {
        return Promise.all(doc.map((item) => this.create(item)));
      }
      const instance = new DocumentClass(doc, { isNew: true });
      await instance.save();
      return instance;
    }

    static async insertMany(docs) {
      if (!Array.isArray(docs)) {
        throw new Error('insertMany expects an array');
      }
      const results = [];
      for (const doc of docs) {
        const instance = new DocumentClass(doc, { isNew: true });
        await instance.save();
        results.push(instance);
      }
      return results;
    }

    static find(filter = {}) {
      return new InMemoryQuery(this, filter);
    }

    static async findOne(filter = {}) {
      const docs = await this.find(filter).limit(1);
      return docs[0] || null;
    }

    static async findById(id) {
      const objectId = toObjectId(id);
      const doc = store.find((item) => equals(item._id, objectId));
      return doc ? this._hydrate(doc) : null;
    }

    static async findByIdAndUpdate(id, update = {}, options = {}) {
      const doc = await this.findById(id);
      if (!doc) return null;
      Object.entries(update).forEach(([key, value]) => {
        if (key.startsWith('$')) {
          if (key === '$set') {
            Object.entries(value).forEach(([path, val]) => setValue(doc, path, cloneDoc(val)));
          }
        } else {
          setValue(doc, key, cloneDoc(value));
        }
      });
      await doc.save();
      return options.new ? doc : this._hydrate(doc.__original);
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
      const doc = await this.findOne(filter);
      if (!doc) return null;
      Object.entries(update).forEach(([key, value]) => {
        if (key.startsWith('$')) {
          if (key === '$set') {
            Object.entries(value).forEach(([path, val]) => setValue(doc, path, cloneDoc(val)));
          }
        } else {
          setValue(doc, key, cloneDoc(value));
        }
      });
      await doc.save();
      return options.new ? doc : this._hydrate(doc.__original);
    }

    static async findByIdAndDelete(id) {
      const doc = await this.findById(id);
      if (!doc) return null;
      await doc.deleteOne();
      return doc;
    }

    static async deleteMany(filter = {}) {
      let deletedCount = 0;
      for (let index = store.length - 1; index >= 0; index -= 1) {
        if (matchesFilter(store[index], filter)) {
          store.splice(index, 1);
          deletedCount += 1;
        }
      }
      return { acknowledged: true, deletedCount };
    }

    static async countDocuments(filter = {}) {
      return store.filter((doc) => matchesFilter(doc, filter)).length;
    }

    static async aggregate(pipeline = []) {
      return runAggregate(this, pipeline);
    }
  }

  if (options.statics) {
    Object.entries(options.statics).forEach(([name, fn]) => {
      InMemoryModel[name] = fn.bind(InMemoryModel);
    });
  }

  registry.set(modelName, InMemoryModel);
  return InMemoryModel;
};

const resetDatabase = () => {
  registry.forEach((model) => {
    model.store.length = 0;
  });
};

module.exports = {
  createModel,
  resetDatabase,
  registry
};
