jest.mock('node-fetch', () => jest.fn());

const fetchMock = require('node-fetch');

const loadService = () => {
  delete require.cache[require.resolve('../../src/services/cora.service')];
  return require('../../src/services/cora.service');
};

describe('cora.service helpers', () => {
  const sampleText = 'Todos los proyectos consideran cada caso pero ninguna evidencia respalda la afirmación.';

  beforeEach(() => {
    fetchMock.mockReset();
    process.env.CORA_AGENT_URL = 'http://cora.local';
    process.env.CORA_API_KEY = 'test-key';
    process.env.CORA_CHATBOT_ID = 'test-chat';
  });

  it('sanitizes prohibited words returned by CORA and adds warnings', async () => {
    const coraService = loadService();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: `${sampleText}\n\n**Glosario breve**\n- término inicial`
            }
          }
        ]
      })
    });

    const originalDraft = `${sampleText} ${sampleText} ${sampleText}\n\n**Glosario breve**\n- base\n- adicional`;

    const config = {
      tema: 'Pruebas unitarias',
      publico: 'estudiantes',
      nivel: 'intermedio',
      proposito: 'aplicar',
      ventanaInicio: '2020',
      ventanaFin: '2025',
      idioma: 'español',
      textoOriginal: originalDraft,
      instruccionesDocente: 'Amplia el glosario y agrega mas informacion clara en los parrafos',
      sesgosDetectados: [
        {
          palabrasProblematicas: ['todos', 'cada', 'ninguna']
        }
      ]
    };

    const result = await coraService.generateEducationalText(config);
    const { content } = result.choices[0].message;

    expect(content).not.toMatch(/\btodos\b/i);
    expect(content).not.toMatch(/\bcada\b/i);
    expect(content).not.toMatch(/\bninguna\b/i);
    expect(result.validationWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('glosario'),
        expect.stringContaining('información')
      ])
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/chat/completions'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('exposes utility helpers that respect unicode boundaries', () => {
    const { __testables } = loadService();
    const {
      replaceProhibitedWords,
      containsProhibitedWord,
      countGlossaryItems,
      countWords,
      normalizeDiacritics
    } = __testables;

    const original = 'Todos los métodos aplican cada variable y ninguna excepción se documenta.';
    const result = replaceProhibitedWords(original, ['todos', 'cada', 'ninguna']);

    expect(result.text).toContain('La mayoría los métodos');
    expect(result.text).toContain('varios variable');
    expect(result.text).toContain('pocas excepción');
    expect(result.text).toMatch(/métodos/);
    expect(result.replacementsApplied).toHaveLength(3);

    const uppercase = replaceProhibitedWords('TODOS LOS CASOS', ['todos']);
    expect(uppercase.text).toContain('LA MAYORÍA LOS CASOS');

    expect(containsProhibitedWord('Esta frase incluye ninguna garantía.', 'ninguna')).toBe(true);
    expect(containsProhibitedWord('Métodos seguros', 'todos')).toBe(false);

    const glossaryMarkdown = '**Glosario breve**\n- término A\n- término B\n\nConclusión';
    expect(countGlossaryItems(glossaryMarkdown)).toBe(2);
    expect(countWords('   esta   frase  tiene cinco palabras exactas  ')).toBe(6);
    expect(normalizeDiacritics('Información técnica')).toBe('Informacion tecnica');
  });

  it('parses structured JSON payloads in legacy correction mode', async () => {
    const coraService = loadService();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ texto_didactico_5x8: 'Texto corregido sin sesgos.' })
            }
          }
        ]
      })
    });

    const config = {
      tema: 'Corrección legacy',
      publico: 'docentes',
      nivel: 'avanzado',
      proposito: 'evaluar',
      ventanaInicio: '2021',
      ventanaFin: '2023',
      idioma: 'español',
      correcciones: 'Ajusta el texto y resume ideas principales.'
    };

    const result = await coraService.generateEducationalText(config);
    expect(result.choices[0].message.content).toBe('Texto corregido sin sesgos.');
    expect(result.validationWarnings).toBeUndefined();
  });

  it('permits normal generation mode without sesgos detectados', async () => {
    const coraService = loadService();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Contenido generado libremente.'
            }
          }
        ]
      })
    });

    const result = await coraService.generateEducationalText({
      tema: 'Generación libre',
      publico: 'general',
      nivel: 'básico',
      proposito: 'explicar',
      ventanaInicio: '2020',
      ventanaFin: '2025',
      idioma: 'español'
    });

    expect(result.choices[0].message.content).toBe('Contenido generado libremente.');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('genera prompts de preguntas incorporando correcciones', async () => {
    const coraService = loadService();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ questions: ['Pregunta 1'] })
    });

    const data = await coraService.generateQuestions({
      textContent: 'Contenido base',
      textTitle: 'Título',
      nivel: 'intermedio',
      correcciones: 'Incluye dos preguntas de aplicación'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/chat/completions'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(data.questions).toEqual(['Pregunta 1']);
  });

  it('genera feedback integrando sesgos detectados', async () => {
    const coraService = loadService();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'Feedback generado' } }] })
    });

    const payload = {
      pregunta: '¿Qué es una hipótesis?',
      respuesta: 'Es una suposición sin justificar',
      tema: 'Método científico',
      skill: 'crítica',
      sesgosDetectados: [
        { tag: 'Generalización', type: 'generalización', description: 'Uso de absolutos', suggestion: 'Usa cuantificadores parciales' }
      ],
      puntuacion: 6,
      nivelCalidad: 'intermedio',
      recomendaciones: ['Releer el texto base']
    };

    const data = await coraService.generateFeedback(payload);
    expect(data.choices[0].message.content).toBe('Feedback generado');
  });

  it('solicita respuesta del tutor con identificador de chatbot', async () => {
    const coraService = loadService();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'Tutor responde' } }] })
    });

    const data = await coraService.generateTutorResponse({
      prompt: 'Estudiante pregunta sobre derivadas',
      maxTokens: 200
    });

    expect(data.choices[0].message.content).toBe('Tutor responde');
    const [, requestInit] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(requestInit.headers['X-Chatbot-ID']).toBe(process.env.CORA_CHATBOT_ID);
  });
});
