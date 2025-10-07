require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectMongo, buildMongoUris } = require('./config/mongo');

const PORT = process.env.PORT || 4000;
const MONGO_URIS = buildMongoUris();

(async () => {
  try {
    const connection = await connectMongo(MONGO_URIS);
    console.log(`MongoDB conectado a ${connection.name}`);

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al conectar con MongoDB', error);
    process.exit(1);
  }
})();
