const {
  generateDidacticText,
  detectBiases,
  generateQuestions,
  regenerateText,
  evaluateText
} = require('../../src/services/instructional.service');

describe('Instructional service helpers', () => {
  describe('generateDidacticText', () => {
    it('respects didactic constraints and returns metadata', () => {
      const payload = {
        tema: 'Pensamiento crítico en medios',
        publico: 'estudiantes de secundaria',
        nivel: 'intermedio',
        proposito: 'analizar',
        ventana_temporal: '2015-2024',
        constraints: {
          parrafos: 2,
          minimoPalabras: 60,
          keywords: ['pensamiento crítico', 'sesgos', 'evidencia'],
          tono: 'inspirador'
        }
      };

      const result = generateDidacticText(payload);

      expect(result).toHaveProperty('texto');
      expect(result).toHaveProperty('metadata');
      const paragraphs = result.texto.trim().split(/\n\n+/);
      expect(paragraphs).toHaveLength(payload.constraints.parrafos);
      payload.constraints.keywords.forEach((word) => {
        expect(result.texto.toLowerCase()).toContain(word);
      });
      expect(result.metadata.length).toBeGreaterThanOrEqual(payload.constraints.minimoPalabras);
      expect(result.metadata.tone).toBe(payload.constraints.tono);
      expect(result.metadata.keywords).toEqual(expect.arrayContaining(payload.constraints.keywords));
      expect(result.metadata.topic).toBe(payload.tema);
      expect(result.metadata.audience).toBe(payload.publico);
    });
  });

  describe('detectBiases', () => {
    it('flags common bias patterns with evidence and severity', () => {
      const respuesta = [
        'Todos los estudiantes siempre entienden la noticia sin necesidad de contrastar fuentes.',
        'Claramente, los medios extranjeros manipulan la información y nunca informan de forma neutral.'
      ].join('\n');

      const findings = detectBiases(respuesta);
      expect(findings).toHaveLength(2);
      expect(findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tipo: 'sobregeneralización',
            evidencia: expect.stringContaining('Todos los estudiantes'),
            gravedad: 'alta',
            sugerencia: expect.stringContaining('Evita'),
            linea: 1
          }),
          expect.objectContaining({
            tipo: 'falta de evidencia',
            evidencia: expect.stringContaining('manipulan'),
            gravedad: 'media',
            linea: 2
          })
        ])
      );
    });
  });

  describe('generateQuestions', () => {
    it('genera preguntas categorizadas según el tipo solicitado', () => {
      const textoBase = 'El artículo describe cómo identificar argumentos sólidos y distinguirlos de opiniones sin evidencia.';
      const objetivo = 'Evaluar la capacidad de distinguir evidencia y analizar argumentos';

      const preguntas = generateQuestions({
        texto_base: textoBase,
        objetivo_de_aprendizaje: objetivo
      });

      expect(preguntas.literal).toHaveLength(1);
      expect(preguntas.inferencia[0]).toMatch(/infer/i);
      expect(preguntas.critica[0]).toMatch(/evalu/i);
      expect(preguntas.aplicacion[0]).toMatch(/aplica/i);
      expect(preguntas.metaCognitiva[0]).toMatch(/reflexiona/i);
      expect(preguntas.mcq[0]).toMatchObject({
        prompt: expect.stringContaining('argumento'),
        opciones: expect.arrayContaining([
          expect.objectContaining({ etiqueta: expect.any(String), correcta: expect.any(Boolean) })
        ])
      });
    });
  });

  describe('regenerateText', () => {
    it('aplica instrucciones docentes y documenta los cambios', () => {
      const original = [
        'El texto explica brevemente la importancia de validar fuentes.',
        'Sin embargo, omite ejemplos concretos y recomendaciones prácticas.'
      ].join(' ');

      const instrucciones = [
        'Agregar un ejemplo con estadísticas recientes.',
        'Reforzar la recomendación práctica para el aula.'
      ];

      const hallazgos = [
        { tipo: 'falta de evidencia', evidencia: 'omite ejemplos concretos' },
        { tipo: 'omisión', evidencia: 'recomendaciones prácticas' }
      ];

      const result = regenerateText({
        texto_original: original,
        instrucciones_docente: instrucciones,
        hallazgos_bias: hallazgos
      });

      expect(result.texto_regenerado).toMatch(/porcentaje/);
      expect(result.texto_regenerado).toMatch(/actividad guiada/);
      expect(result.changelog).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instruccion: instrucciones[0],
            accion: expect.stringContaining('ejemplo')
          }),
          expect.objectContaining({
            instruccion: instrucciones[1],
            accion: expect.stringContaining('recomendación')
          })
        ])
      );
    });
  });

  describe('evaluateText', () => {
    it('calcula puntajes por dimensión y sugiere comentarios', () => {
      const texto = [
        'El recurso presenta definiciones claras de argumento y evidencia.',
        'Incluye un ejemplo desarrollado y mantiene un tono neutral.',
        'No incorpora sesgos emocionales y describe pasos replicables.'
      ].join(' ');

      const rubrica = {
        claridad: { peso: 0.25, criterios: ['definiciones', 'pasos'] },
        precision: { peso: 0.2, criterios: ['ejemplo', 'datos'] },
        cobertura: { peso: 0.2, criterios: ['argumento', 'evidencia'] },
        neutralidad: { peso: 0.15, criterios: ['neutral', 'sin sesgo'] },
        nivel_lenguaje: { peso: 0.2, criterios: ['tono', 'terminología'] }
      };

      const resultado = evaluateText({ texto, rubrica });

      expect(resultado.scores).toMatchObject({
        claridad: expect.any(Number),
        precision: expect.any(Number),
        cobertura: expect.any(Number),
        neutralidad: expect.any(Number),
        nivel_lenguaje: expect.any(Number)
      });
      Object.values(resultado.scores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
      expect(resultado.comentarios_sugeridos).toEqual(
        expect.arrayContaining([
          expect.stringContaining('defin'),
          expect.stringContaining('neutral'),
          expect.stringContaining('mejorar')
        ])
      );
    });
  });
});
