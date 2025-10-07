const fetch = require('node-fetch');

const CORA_AGENT_URL = process.env.CORA_AGENT_URL;
const CORA_CHATBOT_ID = process.env.CORA_CHATBOT_ID;
const CORA_API_KEY = process.env.CORA_API_KEY;

const PROHIBITED_REPLACEMENTS = {
  todos: 'la mayoría',
  todo: 'la mayoría',
  todas: 'la mayoría',
  toda: 'la mayoría',
  cada: 'varios',
  ninguna: 'pocas',
  ninguno: 'pocos',
  ningún: 'pocos'
};

const escapeRegExp = (text) => text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const applyReplacementCasing = (original, replacement) => {
  if (!original) return replacement;
  const isUpperCase = original === original.toUpperCase();
  const isCapitalized = original[0] === original[0].toUpperCase();

  if (isUpperCase) {
    return replacement.toUpperCase();
  }
  if (isCapitalized) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
};

const replaceProhibitedWords = (text, words) => {
  if (!text || !Array.isArray(words) || words.length === 0) {
    return { text, replacementsApplied: [] };
  }

  let updated = text;
  const replacementsApplied = [];

  words.forEach(word => {
    const normalized = typeof word === 'string' ? word.toLowerCase().trim() : '';
    if (!normalized) return;

    const replacement = PROHIBITED_REPLACEMENTS[normalized] || 'varios';
    const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}_])${escapeRegExp(normalized)}(?=$|[^\\p{L}\\p{N}_])`, 'giu');

    if (regex.test(updated)) {
      updated = updated.replace(regex, match => applyReplacementCasing(match, replacement));
      replacementsApplied.push({ palabra: normalized, reemplazo: replacement });
    }
  });

  return { text: updated, replacementsApplied };
};

const containsProhibitedWord = (text, word) => {
  if (!text || !word) return false;
  const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}_])${escapeRegExp(word)}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
  return regex.test(text);
};

const countGlossaryItems = (text) => {
  if (!text || typeof text !== 'string') return 0;
  const sections = text.split(/\*\*Glosario breve\*\*/i);
  if (sections.length < 2) return 0;

  const glossaryPart = sections[1];
  return glossaryPart
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-'))
    .length;
};

const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .length;
};

const normalizeDiacritics = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Genera un texto educativo usando el agente CORA de DigitalOcean
 * @param {Object} config - Configuración para la generación
 * @param {string} config.tema - Tema del texto
 * @param {string} config.publico - Público objetivo
 * @param {string} config.nivel - Nivel de complejidad
 * @param {string} config.proposito - Propósito del texto
 * @param {number} config.ventanaInicio - Año de inicio de la ventana temporal
 * @param {number} config.ventanaFin - Año de fin de la ventana temporal
 * @param {string} config.idioma - Idioma del texto
 * @returns {Promise<Object>} Respuesta del agente CORA
 */
async function generateEducationalText(config) {
  try {
    console.log('📤 Enviando solicitud a CORA...');
    
    // Construir la URL correcta según la documentación de DigitalOcean
    const endpoint = `${CORA_AGENT_URL}/api/v1/chat/completions`;
    console.log('URL:', endpoint);
    console.log('Config:', config);

    let userMessage;
    let prohibitedWords = [];
    const validationWarnings = [];
    const isCorrectionMode = Array.isArray(config.sesgosDetectados) && config.sesgosDetectados.length > 0;
    
    // ✅ MODO CORRECCIÓN - El agente YA TIENE todas las instrucciones en su SYSTEM prompt
    if (isCorrectionMode) {
      
      // Extraer palabras problemáticas
      const todasLasPalabras = new Set();
      config.sesgosDetectados.forEach(sesgo => {
        if (sesgo.palabrasProblematicas && sesgo.palabrasProblematicas.length > 0) {
          sesgo.palabrasProblematicas.forEach(p => todasLasPalabras.add(p.toLowerCase()));
        }
      });
      
      const palabrasArray = Array.from(todasLasPalabras);
      prohibitedWords = palabrasArray;
      
      // Construir mensaje según el formato que el agente espera
      userMessage = `MODO=CORREGIR\n`;
      userMessage += `PRODUCE=TEXTO\n`;
      userMessage += `FORMATO_TEXTO: 5 párrafos × 8 líneas. 12–18 palabras por línea.\n`;
      userMessage += `SECCIONES_TEXTO: "Ejemplos claros y precisos" (5 ítems) y "Glosario breve" (8–10 términos).\n\n`;
      
      // 🔥 MAPA EXPLÍCITO DE REEMPLAZOS
      if (palabrasArray.length > 0) {
        userMessage += `🚫 PALABRAS PROHIBIDAS Y SUS REEMPLAZOS:\n`;
        palabrasArray.forEach(palabra => {
          const reemplazo = PROHIBITED_REPLACEMENTS[palabra.toLowerCase()] || 'varios';
          userMessage += `   ❌ "${palabra}" → ✅ "${reemplazo}"\n`;
        });
        userMessage += `\n`;
      }
      
      userMessage += `⚠️⚠️⚠️ INSTRUCCIONES CRÍTICAS - CUMPLIMIENTO OBLIGATORIO ⚠️⚠️⚠️\n\n`;
      
      userMessage += `1. BÚSQUEDA: Lee el texto línea por línea y encuentra TODAS las ocurrencias de las palabras prohibidas listadas arriba.\n\n`;
      
      userMessage += `2. REEMPLAZO: Para cada palabra prohibida que encuentres:\n`;
      userMessage += `   - Identifica la oración completa que la contiene\n`;
      userMessage += `   - Reescribe la oración usando el reemplazo sugerido\n`;
      userMessage += `   - Ajusta la gramática si es necesario (concordancia verbal, género, número)\n`;
      userMessage += `   - Ejemplo: "Se deben validar todas las etapas" → "Se deben validar la mayoría de las etapas"\n`;
      userMessage += `   - Ejemplo: "varios alumno elabora" → "varios alumnos elaboran" (concordancia plural)\n`;
      userMessage += `   - Ejemplo: "métodos" NO debe convertirse en "méla mayoríados" - NO toques palabras correctas\n\n`;
      
      userMessage += `3. PRESERVACIÓN: Mantén EXACTAMENTE:\n`;
      userMessage += `   - Formato 5×8 (5 párrafos de 8 líneas)\n`;
      userMessage += `   - Secciones "Ejemplos claros y precisos" (5 ítems) y "Glosario breve" (8-10 términos)\n`;
      userMessage += `   - Todo el contenido técnico y educativo\n\n`;
      
      userMessage += `4. VERIFICACIÓN FINAL: Antes de entregar el texto corregido:\n`;
      userMessage += `   - Revisa línea por línea\n`;
      userMessage += `   - Confirma que NO aparece ninguna de las palabras prohibidas\n`;
      userMessage += `   - Verifica que NO corrompiste palabras correctas como "métodos"\n\n`;
      
      if (config.instruccionesDocente && config.instruccionesDocente.trim()) {
        userMessage += `📝 INSTRUCCIONES ADICIONALES DEL PROFESOR:\n${config.instruccionesDocente}\n\n`;
      }
      
      userMessage += `� TEXTO ORIGINAL PARA CORREGIR:\n\n${config.textoOriginal}\n\n`;
      
      userMessage += `═══════════════════════════════════════════════════════\n`;
      userMessage += `🎯 RECORDATORIO: Reemplaza ${palabrasArray.map(p => `"${p}"`).join(', ')}\n`;
      userMessage += `✍️ Genera el texto corregido ahora, siguiendo las instrucciones al pie de la letra.\n`;
      userMessage += `═══════════════════════════════════════════════════════`;
      
      console.log('✅ Construido mensaje de corrección DIRECTO con palabras prohibidas:', palabrasArray);
      
    } 
    // ⚠️ Mantener compatibilidad con formato legacy
    else if (config.correcciones && config.correcciones.trim()) {
      userMessage = `🔄 MODO: CORRECCIÓN DE SESGOS Y REGENERACIÓN\n\n`;
      userMessage += `📋 PARÁMETROS DEL TEXTO:\n`;
      userMessage += `tema=${config.tema}; publico=${config.publico}; nivel=${config.nivel}; proposito=${config.proposito}; ventana_temporal=${config.ventanaInicio}-${config.ventanaFin}; idioma=${config.idioma}\n\n`;
      userMessage += `🚨 INSTRUCCIONES DE CORRECCIÓN:\n`;
      userMessage += config.correcciones;
      console.log('⚠️  Usando formato legacy de correcciones');
      
    } 
    // ➕ MODO NORMAL: Generación desde cero
    else {
      userMessage = `tema=${config.tema}; publico=${config.publico}; nivel=${config.nivel}; proposito=${config.proposito}; ventana_temporal=${config.ventanaInicio}-${config.ventanaFin}; idioma=${config.idioma}`;
      console.log('➕ Modo generación normal desde cero');
    }

    // Formato según documentación oficial de DigitalOcean
    const requestBody = {
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ],
      stream: false,
      include_retrieval_info: false,
      include_functions_info: false,
      include_guardrails_info: false
    };

    console.log('📨 Request body:', JSON.stringify(requestBody, null, 2));
    console.log('📝 Longitud del mensaje:', userMessage.length, 'caracteres');
    if (isCorrectionMode) {
      console.log('✅ MODO CORRECCIÓN ACTIVADO - Enviando instrucciones de eliminación de sesgos');
    } else if (config.correcciones) {
      console.log('✅ MODO CORRECCIÓN (LEGACY) - Enviando instrucciones personalizadas');
    } else {
      console.log('➕ MODO GENERACIÓN NORMAL - Creando texto desde cero');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CORA_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Respuesta recibida:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de CORA:', errorText);
      throw new Error(`Error del agente CORA (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Datos recibidos de CORA');
    
    // Extraer el contenido del mensaje
    let content = data.choices[0].message.content;
    
    // Si el contenido está en formato JSON con campo "texto_didactico_5x8", extraerlo
    if (content.includes('"texto_didactico_5x8"')) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*"texto_didactico_5x8"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          content = parsed.texto_didactico_5x8;
          console.log('✅ Texto extraído del campo "texto_didactico_5x8"');
        }
      } catch (e) {
        console.log('⚠️  No se pudo parsear JSON, usando contenido original');
      }
    }
    
    if (prohibitedWords.length > 0) {
      // 🔧 POST-PROCESAMIENTO AGRESIVO
      
      // Paso 1: Corregir corrupciones conocidas (méla mayoría → métodos)
      content = content.replace(/méla mayoría/gi, 'métodos');
      content = content.replace(/la mayoríados/gi, 'todos'); // Si se corrompió, mantener original mejor
      
      // Paso 2: Reemplazar palabras prohibidas que quedaron
      const { text: sanitizedText, replacementsApplied } = replaceProhibitedWords(content, prohibitedWords);
      if (replacementsApplied.length > 0) {
        console.log('🔁 Reemplazos aplicados en post-procesamiento:', replacementsApplied);
      }
      
      // Paso 3: Corregir concordancias comunes
      let finalText = sanitizedText;
      finalText = finalText.replace(/varios\s+(\w+)\s+elabora\b/gi, (match, noun) => {
        return `varios ${noun}s elaboran`;
      });
      finalText = finalText.replace(/varios\s+alumno\b/gi, 'varios alumnos');
      finalText = finalText.replace(/varios\s+estudiante\b/gi, 'varios estudiantes');

      // Paso 4: Verificación final
      const remaining = prohibitedWords.filter(word => containsProhibitedWord(finalText, word));
      if (remaining.length > 0) {
        console.warn('⚠️ Palabras prohibidas AÚN presentes tras sanitización:', remaining);
        validationWarnings.push(`El texto generado aún contiene términos no permitidos: ${remaining.join(', ')}`);
      } else {
        console.log('✅ Todas las palabras prohibidas fueron eliminadas exitosamente');
      }

      content = finalText;
    }

    if (isCorrectionMode && config.instruccionesDocente && typeof config.instruccionesDocente === 'string') {
      const instruction = config.instruccionesDocente.toLowerCase();
      const normalizedInstruction = normalizeDiacritics(instruction);
      if ((instruction.includes('amplia el glosario') || instruction.includes('amplica el glosario')) && config.textoOriginal) {
        const originalGlossaryCount = countGlossaryItems(config.textoOriginal);
        const updatedGlossaryCount = countGlossaryItems(content);

        if (updatedGlossaryCount <= originalGlossaryCount) {
          const warningMessage = `El glosario no se amplió (original: ${originalGlossaryCount} ítems, nuevo: ${updatedGlossaryCount} ítems).`;
          validationWarnings.push(warningMessage);
          console.warn('⚠️ Advertencia de validación:', warningMessage);
        }
      }

      if (normalizedInstruction.includes('agrega') && normalizedInstruction.includes('informacion') && config.textoOriginal) {
        const originalWordCount = countWords(config.textoOriginal);
        const updatedWordCount = countWords(content);

        if (updatedWordCount <= originalWordCount) {
          const warningMessage = `El texto corregido no aumenta la cantidad de información (original: ${originalWordCount} palabras, nuevo: ${updatedWordCount} palabras).`;
          validationWarnings.push(warningMessage);
          console.warn('⚠️ Advertencia de validación:', warningMessage);
        }
      }
    }

    if (validationWarnings.length > 0) {
      data.validationWarnings = validationWarnings;
    }

    // Actualizar el contenido procesado
    data.choices[0].message.content = content;
    
    return data;

  } catch (error) {
    console.error('❌ Error en generateEducationalText:', error);
    throw error;
  }
}

/**
 * Genera preguntas basadas en un texto educativo
 * @param {Object} config - Configuración para la generación de preguntas
 * @param {string} config.textContent - Contenido del texto base
 * @param {string} config.textTitle - Título del texto
 * @param {string} config.nivel - Nivel del texto
 * @param {string} config.correcciones - Correcciones del docente (opcional)
 * @returns {Promise<Object>} Respuesta del agente CORA con preguntas
 */
async function generateQuestions(config) {
  try {
    console.log('📤 Enviando solicitud a CORA para generar preguntas...');
    
    const endpoint = `${CORA_AGENT_URL}/api/v1/chat/completions`;
    console.log('URL:', endpoint);

    // Construir el prompt para generar preguntas
    let userMessage = `Genera preguntas de comprensión para el siguiente texto educativo:

TÍTULO: ${config.textTitle}
NIVEL: ${config.nivel}

TEXTO:
${config.textContent}

INSTRUCCIONES PARA GENERAR PREGUNTAS:

1. Variedad de niveles cognitivos:
   - Preguntas literales (recuperar información explícita)
   - Preguntas de inferencia (deducir algo no dicho directamente)
   - Preguntas críticas (valorar, comparar, cuestionar supuestos)
   - Preguntas de aplicación (usar el concepto en un caso nuevo)

2. Cantidad: Genera entre 6 y 10 preguntas en total

3. Formato de cada pregunta:
   - Tipo: literal | inferencia | crítica | aplicación
   - Pregunta: (texto de la pregunta)
   - Explicación: (qué evalúa esta pregunta)

4. Reglas:
   - Cada pregunta debe estar vinculada con el texto
   - No repetir la misma idea
   - Lenguaje sencillo y directo
   - Al menos 2 preguntas por tipo

FORMATO DE SALIDA:
Lista las preguntas en este formato exacto:

Pregunta 1
Tipo: [literal/inferencia/crítica/aplicación]
Pregunta: [texto de la pregunta]
Explicación: [qué evalúa]

Pregunta 2
Tipo: [literal/inferencia/crítica/aplicación]
Pregunta: [texto de la pregunta]
Explicación: [qué evalúa]

(continuar hasta completar 6-10 preguntas)`;

    // Si hay correcciones, agregarlas
    if (config.correcciones && config.correcciones.trim()) {
      userMessage += `\n\nCORRECCIONES SOLICITADAS POR EL DOCENTE:\n${config.correcciones}\n\nPor favor, ajusta las preguntas considerando estas correcciones.`;
    }

    const requestBody = {
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ],
      stream: false,
      include_retrieval_info: false,
      include_functions_info: false,
      include_guardrails_info: false
    };

    console.log('📨 Generando preguntas...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CORA_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Respuesta recibida:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de CORA:', errorText);
      throw new Error(`Error del agente CORA (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Preguntas generadas por CORA');
    
    return data;

  } catch (error) {
    console.error('❌ Error en generateQuestions:', error);
    throw error;
  }
}

/**
 * Genera feedback automático para una respuesta de estudiante usando IA
 * @param {Object} config - Configuración para el feedback
 * @param {string} config.pregunta - La pregunta realizada
 * @param {string} config.respuesta - La respuesta del estudiante
 * @param {string} config.tema - Tema del texto/pregunta
 * @param {string} config.skill - Habilidad evaluada (literal, inferencial, crítica, aplicación)
 * @param {string} config.textoContexto - Contexto del texto (opcional)
 * @returns {Promise<Object>} Respuesta del agente CORA con evaluación
 */
async function generateFeedback(config) {
  try {
    console.log('📤 Generando feedback automático con CORA...');
    
    const endpoint = `${CORA_AGENT_URL}/api/v1/chat/completions`;
    
    // Construir prompt con información de sesgos (si existe)
    let userMessage = `Eres un experto evaluador académico que proporciona retroalimentación constructiva y motivadora.

CONTEXTO:
- Tema: ${config.tema}
- Habilidad evaluada: ${config.skill}
${config.textoContexto ? `- Texto de referencia: ${config.textoContexto.substring(0, 500)}...` : ''}

PREGUNTA:
${config.pregunta}

RESPUESTA DEL ESTUDIANTE:
${config.respuesta}`;

    // ✅ INCLUIR ANÁLISIS DE SESGOS SI EXISTE
    if (config.sesgosDetectados && config.sesgosDetectados.length > 0) {
      userMessage += `\n\nANÁLISIS AUTOMÁTICO DE SESGOS DETECTADOS:
Puntuación: ${config.puntuacion}/12
Nivel: ${config.nivelCalidad}
Sesgos identificados: ${config.sesgosDetectados.length}

Detalles de sesgos:`;
      
      config.sesgosDetectados.forEach((sesgo, idx) => {
        userMessage += `\n${idx + 1}. ${sesgo.tag} - ${sesgo.type}: ${sesgo.description}
   Sugerencia: ${sesgo.suggestion}`;
      });

      if (config.recomendaciones && config.recomendaciones.length > 0) {
        userMessage += `\n\nRecomendaciones pedagógicas:`;
        config.recomendaciones.forEach(rec => {
          userMessage += `\n- ${rec}`;
        });
      }
    }

    userMessage += `\n\nPROPORCIONA RETROALIMENTACIÓN ACADÉMICA Y MOTIVADORA:

1. FORTALEZAS (menciona al menos 2 aspectos positivos específicos):
- [Qué hizo bien el estudiante]

2. ÁREAS DE MEJORA (sé específico y constructivo):
- [Qué puede mejorar, con ejemplos concretos]

3. RECOMENDACIONES ACCIONABLES (pasos claros para mejorar):
- [Sugerencias específicas que el estudiante puede aplicar]

4. MOTIVACIÓN Y CIERRE:
[Mensaje motivador que refuerce la importancia del aprendizaje continuo]

FORMATO: Usa un tono académico pero cercano, como un tutor que busca ayudar al estudiante a crecer. Si hay sesgos detectados, explícalos de manera que el estudiante entienda por qué son importantes y cómo corregirlos.`;

    const requestBody = {
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ],
      stream: false,
      include_retrieval_info: false,
      include_functions_info: false,
      include_guardrails_info: false
    };

    console.log('📨 Solicitando evaluación a CORA...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CORA_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Respuesta recibida:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de CORA:', errorText);
      throw new Error(`Error del agente CORA (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Feedback generado por CORA');
    
    return data;

  } catch (error) {
    console.error('❌ Error en generateFeedback:', error);
    throw error;
  }
}

async function generateBiasDidacticPack(config) {
  try {
    console.log('📤 Solicitando informe didáctico de sesgos a CORA...');

    const endpoint = `${CORA_AGENT_URL}/api/v1/chat/completions`;

    const {
      tema,
      publico,
      nivel,
      proposito,
      ventanaInicio,
      ventanaFin,
      idioma,
      pregunta,
      respuestaEstudiante,
      textoContexto,
      sesgosDetectados = [],
      puntuacion,
      nivelCalidad,
      recomendaciones = []
    } = config;

    const resumenSesgos = sesgosDetectados.length === 0
      ? 'Sin sesgos detectados'
      : sesgosDetectados.map(s => {
          const parts = [];
          if (s.tag) parts.push(s.tag);
          if (s.type) parts.push(s.type);
          if (s.description) parts.push(s.description);
          return `- ${parts.join(' | ')}`;
        }).join('\n');

    const recomendacionesTexto = recomendaciones.length > 0
      ? recomendaciones.map((r, idx) => `${idx + 1}. ${r}`).join('\n')
      : 'Sin recomendaciones adicionales.';

    const contextoTexto = textoContexto ? textoContexto.substring(0, 1200) : '';

    // ✅ REPORTE DE SESGOS - Análisis específico de la respuesta del estudiante
    const userMessage = `Analiza los sesgos en la respuesta del estudiante y genera un reporte educativo.

PREGUNTA:
${pregunta}

RESPUESTA DEL ESTUDIANTE:
"${respuestaEstudiante}"

TEXTO BASE:
${contextoTexto}

ANÁLISIS AUTOMÁTICO:
${resumenSesgos}
Puntuación: ${puntuacion}/${config.maxScore || 12} | Nivel: ${nivelCalidad}

GENERA UN REPORTE que explique:

1. ¿Qué sesgos tiene esta respuesta específica?
   - Menciona lo que el estudiante escribió literalmente
   - Compara con lo que debería haber escrito según el texto base

2. ¿Por qué son problemáticos estos sesgos?
   - Qué conceptos clave del texto ignoró
   - Qué errores de razonamiento cometió

3. ¿Cómo puede mejorar el estudiante?
   - Pasos concretos para corregir la respuesta
   - Ejemplos de cómo reescribir usando conceptos del texto

El reporte debe ser claro, directo y enfocado EN ESTA RESPUESTA.
NO hagas un texto genérico sobre sesgos en general.

Público: ${publico} | Nivel: ${nivel} | Idioma: ${idioma}

${recomendaciones.length > 0 ? `Recomendaciones:\n${recomendacionesTexto}` : ''}`;

    const requestBody = {
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ],
      stream: false,
      include_retrieval_info: false,
      include_functions_info: false,
      include_guardrails_info: false
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CORA_API_KEY}`,
        'X-Chatbot-ID': CORA_CHATBOT_ID
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Respuesta recibida:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de CORA en informe didáctico:', errorText);
      throw new Error(`Error del agente CORA (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Informe didáctico de sesgos generado correctamente');
    return data;
  } catch (error) {
    console.error('❌ Error en generateBiasDidacticPack:', error);
    throw error;
  }
}

/**
 * Genera respuesta del tutor personal usando CORA
 * @param {Object} config - Configuración
 * @param {string} config.prompt - Prompt con contexto completo
 * @param {string} config.message - Mensaje del estudiante
 * @param {number} config.maxTokens - Tokens máximos de respuesta
 * @returns {Promise<Object>} Respuesta del tutor
 */
async function generateTutorResponse(config) {
  try {
    console.log('🤖 Generando respuesta del tutor con CORA...');
    
    const endpoint = `${CORA_AGENT_URL}/api/v1/chat/completions`;

    const requestBody = {
      messages: [
        {
          role: "system",
          content: "Eres un tutor personal experto, amigable y motivador que ayuda a estudiantes a aprender mejor."
        },
        {
          role: "user",
          content: config.prompt
        }
      ],
      stream: false,
      max_tokens: config.maxTokens || 800,
      temperature: 0.7,
      include_retrieval_info: false,
      include_functions_info: false,
      include_guardrails_info: false
    };

    console.log('📨 Enviando consulta al tutor...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CORA_API_KEY}`,
        'X-Chatbot-ID': CORA_CHATBOT_ID
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 Respuesta recibida:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de CORA:', errorText);
      throw new Error(`Error del agente CORA (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta del tutor generada exitosamente');
    
    return data;

  } catch (error) {
    console.error('❌ Error en generateTutorResponse:', error);
    throw error;
  }
}

module.exports = {
  generateEducationalText,
  generateQuestions,
  generateFeedback,
  generateBiasDidacticPack,
  generateTutorResponse,
  __testables: {
    replaceProhibitedWords,
    containsProhibitedWord,
    countGlossaryItems,
    countWords,
    normalizeDiacritics
  }
};
