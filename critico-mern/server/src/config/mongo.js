const mongoose = require('mongoose');

const buildMongoUris = () => {
  const candidates = [
    process.env.MONGO_URI,
    process.env.MONGO_URI_LOCAL,
    'mongodb://localhost:27017/critico'
  ].filter(Boolean);
  return [...new Set(candidates)];
};

const connectMongo = async (uris) => {
  mongoose.set('strictQuery', true);
  const candidates = Array.isArray(uris) ? uris.filter(Boolean) : buildMongoUris();
  if (!candidates.length) {
    throw new Error('No se proporcionaron URIs de MongoDB');
  }

  let lastError;
  for (const uri of candidates) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
      });
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      const message = error?.message || '';
      const transient = ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN'].some((code) =>
        message.includes(code)
      );
      if (!transient) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.warn(`No se pudo conectar a ${uri}: ${message}`);
    }
  }

  throw lastError;
};

module.exports = {
  connectMongo,
  buildMongoUris
};
