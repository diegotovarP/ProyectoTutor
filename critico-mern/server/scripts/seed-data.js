/* eslint-disable no-console */
/**
 * Script para poblar la base de datos con datos iniciales
 * Ejecutar: npm run db:seed
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Importar modelos
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const Text = require('../src/models/Text');
const Question = require('../src/models/Question');

// URI de conexión (usar LOCAL si estás en Windows sin Docker)
const MONGO_URI = process.env.MONGO_URI_LOCAL || process.env.MONGO_URI;

console.log('🔌 Conectando a MongoDB...');
console.log('URI:', MONGO_URI);

async function seedDatabase() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Preguntar si quiere borrar datos existentes
    console.log('\n⚠️  ADVERTENCIA: Este script creará datos de ejemplo');
    console.log('Si ya existen datos, se agregarán más (no se borrarán)');
    console.log('Para resetear todo, ejecuta: npm run db:reset\n');

    // ==================================================
    // 1. CREAR USUARIOS
    // ==================================================
    console.log('👤 Creando usuarios...');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Admin
    const admin = await User.findOneAndUpdate(
      { email: 'admin@critico.com' },
      {
        name: 'Administrador Sistema',
        email: 'admin@critico.com',
        password: hashedPassword,
        role: 'admin'
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Admin creado');

    // Docente
    const teacher = await User.findOneAndUpdate(
      { email: 'docente@critico.com' },
      {
        name: 'Profesor Carlos Talavera',
        email: 'docente@critico.com',
        password: hashedPassword,
        role: 'teacher'
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Docente creado');

    // Estudiante
    const student = await User.findOneAndUpdate(
      { email: 'estudiante@critico.com' },
      {
        name: 'Estudiante María López',
        email: 'estudiante@critico.com',
        password: hashedPassword,
        role: 'student'
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Estudiante creado');

    // ==================================================
    // 2. CREAR CURSO DE EJEMPLO
    // ==================================================
    console.log('\n📚 Creando curso de ejemplo...');

    const course = await Course.findOneAndUpdate(
      { title: 'Metodología de Investigación - Básico' },
      {
        title: 'Metodología de Investigación - Básico',
        description: 'Curso introductorio sobre metodología científica y pensamiento crítico',
        teacher: teacher._id,
        academicLevel: 'basico',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Curso creado:', course.title);

    // ==================================================
    // 3. CREAR TEXTO DE EJEMPLO
    // ==================================================
    console.log('\n📝 Creando texto académico...');

    const textContent = `
El método científico es un proceso sistemático de investigación que permite obtener conocimiento confiable. 
Este método se basa en la observación empírica y la formulación de hipótesis que pueden ser probadas mediante experimentos.

La investigación científica requiere rigor metodológico y pensamiento crítico. Los investigadores deben ser capaces 
de analizar datos objetivamente, considerar múltiples perspectivas y llegar a conclusiones fundamentadas en evidencia.

Es importante distinguir entre correlación y causalidad. Dos variables pueden estar correlacionadas sin que una cause la otra. 
Por ejemplo, el consumo de helado y los ahogamientos en piscinas están correlacionados (ambos aumentan en verano), 
pero uno no causa el otro.

El pensamiento crítico implica cuestionar supuestos, evaluar evidencia y considerar explicaciones alternativas antes 
de llegar a conclusiones. Esta habilidad es fundamental no solo en la investigación científica, sino en la vida diaria.
    `.trim();

    const text = await Text.findOneAndUpdate(
      { title: 'Introducción al Método Científico' },
      {
        title: 'Introducción al Método Científico',
        content: textContent,
        course: course._id,
        academicLevel: 'basico',
        biasAnalysis: {
          detected: false,
          count: 0,
          types: [],
          severity: 'ninguna'
        },
        palabrasProblematicas: []
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Texto creado:', text.title);

    // ==================================================
    // 4. CREAR PREGUNTAS DE EJEMPLO
    // ==================================================
    console.log('\n❓ Creando preguntas...');

    // Pregunta Literal
    await Question.findOneAndUpdate(
      { 
        text: text._id,
        prompt: '¿Qué es el método científico según el texto?'
      },
      {
        text: text._id,
        course: course._id,
        prompt: '¿Qué es el método científico según el texto?',
        tipo: 'literal',
        skill: 'comprension',
        hint: 'Busca la definición en el primer párrafo',
        expectedAnswer: 'Es un proceso sistemático de investigación basado en observación empírica y formulación de hipótesis',
        points: 10
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Pregunta literal creada');

    // Pregunta Inferencial
    await Question.findOneAndUpdate(
      {
        text: text._id,
        prompt: '¿Por qué es importante distinguir entre correlación y causalidad?'
      },
      {
        text: text._id,
        course: course._id,
        prompt: '¿Por qué es importante distinguir entre correlación y causalidad?',
        tipo: 'inferencial',
        skill: 'analisis',
        hint: 'Piensa en las consecuencias de confundir ambos conceptos',
        expectedAnswer: 'Para evitar conclusiones erróneas y entender correctamente las relaciones entre variables',
        points: 15
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Pregunta inferencial creada');

    // Pregunta Crítica
    await Question.findOneAndUpdate(
      {
        text: text._id,
        prompt: '¿Cómo aplicarías el pensamiento crítico en tu vida diaria? Da un ejemplo concreto.'
      },
      {
        text: text._id,
        course: course._id,
        prompt: '¿Cómo aplicarías el pensamiento crítico en tu vida diaria? Da un ejemplo concreto.',
        tipo: 'critica',
        skill: 'evaluacion',
        hint: 'Piensa en situaciones donde necesitas tomar decisiones informadas',
        expectedAnswer: 'Evaluando fuentes de información antes de compartir noticias, cuestionando afirmaciones sin evidencia',
        points: 20
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Pregunta crítica creada');

    // ==================================================
    // RESUMEN
    // ==================================================
    console.log('\n✅ BASE DE DATOS POBLADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('\n📊 RESUMEN:');
    console.log(`  - ${await User.countDocuments()} usuarios`);
    console.log(`  - ${await Course.countDocuments()} cursos`);
    console.log(`  - ${await Text.countDocuments()} textos`);
    console.log(`  - ${await Question.countDocuments()} preguntas`);

    console.log('\n👥 CREDENCIALES DE ACCESO:');
    console.log('==========================');
    console.log('📧 Admin:');
    console.log('   Email: admin@critico.com');
    console.log('   Password: admin123');
    console.log('\n📧 Docente:');
    console.log('   Email: docente@critico.com');
    console.log('   Password: admin123');
    console.log('\n📧 Estudiante:');
    console.log('   Email: estudiante@critico.com');
    console.log('   Password: admin123');

    console.log('\n🌐 ACCESO:');
    console.log('==========');
    console.log('Frontend: http://localhost:5173');
    console.log('Backend: http://localhost:4000/api');
    console.log('Mongo Express: http://localhost:8081 (admin/admin)');

    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error al poblar base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
