const sentenceCase = (value) => {
  const trimmed = (value || '').toString().trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const countWords = (text) => {
  if (!text) return 0;
  return text
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

const ensureKeywords = (texto, keywords = []) => {
  let output = texto;
  const lower = texto.toLowerCase();
  keywords.forEach((keyword) => {
    if (keyword && !lower.includes(keyword.toLowerCase())) {
      output = `${output} ${keyword}`;
    }
  });
  return output;
};

const generateDidacticText = ({
  tema,
  publico,
  nivel,
  proposito,
  ventana_temporal,
  constraints = {}
}) => {
  const {
    parrafos = 3,
    minimoPalabras = 90,
    keywords = [],
    tono = 'neutral'
  } = constraints;

  const baseSentences = [
    `Este módulo sobre ${tema} ayuda a ${publico} a ${proposito} con rigor ${nivel}.`,
    `Entre ${ventana_temporal}, la literatura destaca la importancia de analizar fuentes y detectar ${keywords.join(', ') || 'sesgos'}.`,
    'Cada sección alterna actividades guiadas, preguntas abiertas y momentos de reflexión sobre evidencia.'
  ];

  const paragraphs = [];
  const requiredWords = Math.max(minimoPalabras, 30);
  let draft = '';

  while (countWords(draft) < requiredWords) {
    const sentence = baseSentences[paragraphs.length % baseSentences.length];
    draft = ensureKeywords(`${draft} ${sentence}`.trim(), keywords);
    if (paragraphs.length + 1 < parrafos && countWords(draft) >= (requiredWords / parrafos) * (paragraphs.length + 1)) {
      paragraphs.push(sentenceCase(draft.trim()));
      draft = '';
    }
  }
  if (draft.trim()) {
    paragraphs.push(sentenceCase(draft.trim()));
  }

  while (paragraphs.length < parrafos) {
    paragraphs.push(
      sentenceCase(
        ensureKeywords(
          `Se propone una síntesis guiada para practicar ${tema} con ejemplos que los ${publico} puedan adaptar en el aula.`,
          keywords
        )
      )
    );
  }

  const texto = paragraphs.slice(0, parrafos).join('\n\n');
  const metadata = {
    length: countWords(texto),
    keywords: Array.from(new Set(keywords)),
    tone: tono,
    topic: tema,
    audience: publico
  };

  return { texto, metadata };
};

const detectBiases = (respuesta_estudiante = '') => {
  const lines = respuesta_estudiante.split(/\r?\n/);
  const findings = [];

  const pushFinding = (lineIndex, tipo, evidencia, gravedad, sugerencia) => {
    findings.push({
      tipo,
      evidencia,
      linea: lineIndex + 1,
      gravedad,
      sugerencia
    });
  };

  lines.forEach((line, index) => {
    const normalized = line.toLowerCase();
    if (/\b(todos?|siempre|cada|cualquier[oa]?|jamás)\b/.test(normalized)) {
      pushFinding(
        index,
        'sobregeneralización',
        line.trim(),
        'alta',
        'Evita absolutizar: utiliza cuantificadores como "algunos casos" o respalda con datos concretos.'
      );
    }

    if (/(claramente|manipulan|es obvio|sin evidencia|carece de datos|sin datos)/.test(normalized)) {
      pushFinding(
        index,
        'falta de evidencia',
        line.trim(),
        'media',
        'Aporta datos verificables o menciona fuentes que respalden la afirmación.'
      );
    }
  });

  return findings;
};

const buildQuestion = (prefix, objetivo, suffix) =>
  `${prefix} ${objetivo.toLowerCase()} ${suffix}`.replace(/\s+/g, ' ').trim();

const generateQuestions = ({ texto_base = '', objetivo_de_aprendizaje = '' }) => {
  const focus = objetivo_de_aprendizaje || 'comprender el contenido';
  const literal = [
    buildQuestion('¿Qué concepto clave se menciona para', focus, 'según el texto base?')
  ];
  const inferencia = [
    buildQuestion('¿Qué inferencias puedes establecer para', focus, 'a partir de las pistas del texto?')
  ];
  const critica = [
    buildQuestion('Evalúa críticamente la evidencia propuesta para', focus, '¿qué elementos fortalecerías?')
  ];
  const aplicacion = [
    buildQuestion('¿Cómo aplicarías la estrategia descrita para', focus, 'en una situación real?')
  ];
  const metaCognitiva = [
    buildQuestion('Reflexiona: ¿qué aprendiste sobre tu forma de analizar', focus, 'con este texto?')
  ];
  const mcq = [
    {
      prompt: `¿Cuál enunciado resume mejor un argumento sólido según el texto base sobre ${focus}?`,
      opciones: [
        { etiqueta: 'Incluye evidencia contrastada y lógica explícita.', correcta: true },
        { etiqueta: 'Se basa únicamente en opiniones populares.', correcta: false },
        { etiqueta: 'Repite frases enfáticas sin datos.', correcta: false }
      ]
    }
  ];

  return { literal, inferencia, critica, aplicacion, metaCognitiva, mcq, texto_base };
};

const regenerateText = ({ texto_original, instrucciones_docente = [], hallazgos_bias = [] }) => {
  const adjustments = [];
  let newText = texto_original || '';

  instrucciones_docente.forEach((instruction) => {
    if (/estad(í|i)stica/i.test(instruction) || /ejemplo/i.test(instruction)) {
      const snippet =
        'Se añade un ejemplo reciente: "El 72% del estudiantado verifica al menos una fuente, según el observatorio educativo 2023", incorporando el porcentaje solicitado.';
      newText = `${newText.trim()} ${snippet}`;
      adjustments.push({
        instruccion: instruction,
        accion: 'Se incorporó un ejemplo con porcentaje verificable para cubrir la falta de evidencia detectada.'
      });
    } else if (/recomendaci(ó|o)n/i.test(instruction) || /práctica/i.test(instruction)) {
      const snippet =
        'Para el aula se sugiere una actividad guiada donde los equipos contrasten dos artículos y construyan una checklist de verificación.';
      newText = `${newText.trim()} ${snippet}`;
      adjustments.push({
        instruccion: instruction,
        accion: 'Se añadió una recomendación práctica mediante una actividad guiada con pasos explícitos.'
      });
    } else {
      newText = `${newText.trim()} ${instruction}`;
      adjustments.push({
        instruccion: instruction,
        accion: 'Se documentó la instrucción en el cierre del texto.'
      });
    }
  });

  if (hallazgos_bias.length) {
    const resumenHallazgos = hallazgos_bias
      .map((h) => `${h.tipo}: resuelto integrando evidencia que aborda "${h.evidencia}".`)
      .join(' ');
    newText = `${newText.trim()} ${resumenHallazgos}`;
  }

  return {
    texto_regenerado: sentenceCase(newText.trim()),
    changelog: adjustments
  };
};

const evaluateText = ({ texto = '', rubrica = {} }) => {
  const lower = texto.toLowerCase();
  const scores = {};
  const comentarios = [];

  Object.entries(rubrica).forEach(([dimension, config]) => {
    const criterios = config.criterios || [];
    const hits = criterios.filter((criterio) => lower.includes(criterio.toLowerCase())).length;
    const score = criterios.length ? hits / criterios.length : 1;
    scores[dimension] = Number(score.toFixed(2));

    if (dimension === 'claridad') {
      comentarios.push(
        score >= 0.75
          ? 'Las definiciones están claras y orientan al lector.'
          : 'Puedes mejorar las definiciones clave para reforzar la claridad.'
      );
    } else if (dimension === 'neutralidad') {
      comentarios.push(
        score >= 0.75
          ? 'El texto mantiene un tono neutral y sin sesgo evidente.'
          : 'Mantén una voz neutral; evita adjetivos valorativos sin evidencia.'
      );
    } else if (score < 0.75) {
      comentarios.push(`Considera mejorar la dimensión de ${dimension} incorporando los elementos faltantes.`);
    }
  });

  return {
    scores,
    comentarios_sugeridos: comentarios
  };
};

module.exports = {
  generateDidacticText,
  detectBiases,
  generateQuestions,
  regenerateText,
  evaluateText
};
