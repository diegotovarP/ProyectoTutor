/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectMongo } = require('../src/config/mongo');

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

const loadMigrations = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort()
    .map((file) => ({
      name: file,
      module: require(path.join(MIGRATIONS_DIR, file))
    }));
};

const run = async () => {
  const direction = process.argv[2] || 'up';
  if (!['up', 'down'].includes(direction)) {
    throw new Error('Debes especificar `up` o `down`.');
  }

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/critico';
  console.log('Conectando a MongoDB', uri);
  await connectMongo(uri);

  const migrations = loadMigrations();
  if (!migrations.length) {
    console.log('No hay migraciones para ejecutar.');
    await mongoose.disconnect();
    return;
  }

  for (const migration of migrations) {
    if (typeof migration.module[direction] !== 'function') {
      console.warn(`Migración ${migration.name} no implementa ${direction}`);
      // eslint-disable-next-line no-continue
      continue;
    }
    console.log(`Ejecutando ${direction}: ${migration.name}`);
    // eslint-disable-next-line no-await-in-loop
    await migration.module[direction](mongoose);
  }

  await mongoose.disconnect();
  console.log('Migraciones finalizadas.');
};

run().catch((error) => {
  console.error('Error al ejecutar migraciones:', error);
  process.exit(1);
});
