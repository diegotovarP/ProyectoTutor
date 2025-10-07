/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectMongo, buildMongoUris } = require('../src/config/mongo');

const models = [
  require('../src/models/User'),
  require('../src/models/Course'),
  require('../src/models/Topic'),
  require('../src/models/Text'),
  require('../src/models/Question'),
  require('../src/models/Enrollment'),
  require('../src/models/ReadingProgress'),
  require('../src/models/QuestionAttempt'),
  require('../src/models/Recommendation'),
  require('../src/models/ReadingListItem'),
  require('../src/models/BiasReport'),
  require('../src/models/FeedbackMessage'),
  require('../src/models/Notification'),
  require('../src/models/Policy'),
  require('../src/models/AuditLog')
];

const ensureCollections = async () => {
  for (const Model of models) {
    const name = Model.collection.collectionName;
    try {
      await Model.createCollection();
      console.log(`Colección creada: ${name}`);
    } catch (error) {
      if (error.codeName === 'NamespaceExists' || error.code === 48) {
        console.log(`Colección existente: ${name}`);
      } else {
        throw error;
      }
    }
  }
};

const ensureIndexes = async () => {
  for (const Model of models) {
    const name = Model.collection.collectionName;
    await Model.syncIndexes();
    console.log(`Índices sincronizados: ${name}`);
  }
};

const prepareStructure = async ({ drop = false } = {}) => {
  const uris = buildMongoUris();
  const connection = await connectMongo(uris);

  if (drop) {
    console.log('Eliminando base de datos existente...');
    await mongoose.connection.dropDatabase();
  }

  await ensureCollections();
  await ensureIndexes();

  console.log(`Estructura creada sin datos en la base ${connection.name}.`);

  await mongoose.disconnect();
};

if (require.main === module) {
  const drop = process.argv.includes('--drop');
  prepareStructure({ drop }).catch((error) => {
    console.error('Error preparando estructura:', error);
    process.exit(1);
  });
}

module.exports = {
  prepareStructure
};
