# Critico MERN · Backend

## Requisitos
- Node.js 18+
- MongoDB 7 (usa el `docker-compose.yml` incluido para levantar `mongo` y `mongo-express`).

Instalación:
```bash
npm install
```

Copia `.env.example` a `.env`. El archivo define dos URIs:
- `MONGO_URI` apunta al servicio Docker `mongo` (para cuando el backend se ejecute dentro del mismo stack).
- `MONGO_URI_LOCAL` apunta a `localhost` (útil cuando ejecutas Node desde tu Mac y conectas al contenedor publicado).

Ajusta los valores según tu entorno y asegúrate de que el usuario/clave coincidan con los definidos en `docker-compose.yml`.

## Scripts
- `npm run dev`: inicia el servidor con recarga usando nodemon.
- `npm run start`: inicia en modo producción.
- `npm run db:structure`: crea las colecciones e índices definidos en los modelos sin alterar la información actual.
- `npm run db:reset`: elimina la base de datos objetivo y vuelve a crear colecciones e índices (sin insertar datos).
- `npm run test`: ejecuta pruebas unitarias/integración (Jest + Supertest).
- `node scripts/migrate.js up|down`: ejecuta migraciones ordenadas por nombre.

## Cobertura de historias de usuario (resumen)
- **STU01** Registro/Login/Forgot Password en `/api/auth`. Token JWT y recuperación mock.
- **STU02–STU05** Cursos, temas, textos y visor en `/api/courses`, `/api/topics`, `/api/texts`.
- **STU06–STU07** Preguntas y envíos con feedback en `/api/questions`.
- **STU08–STU09** Detección y reportes de sesgos en `/api/bias`.
- **STU10–STU14** Progreso, métricas e historial en `/api/progress` y modelos relacionados.
- **STU15** Preferencias guardadas en `User.preferences`.
- **DOC01–DOC12** Creación de cursos, temas, feedback, recordatorios y métricas a través de modelos/controladores existentes.
- **ADM01–ADM08** Gestión de roles, políticas, auditorías, catálogo y branding en modelos y rutas `/api/admin`.

Los scripts de base de datos generan la estructura necesaria (colecciones e índices) para comenzar con pruebas o integrar datos por separado.

## Pruebas
Las pruebas usan `mongodb-memory-server`. Ejecuta `npm test` para validar flujo de autenticación, cursos, temas, textos, sesgos y preguntas usando Supertest.
