const biasService = require('../../src/services/bias.service');

describe('biasService.analyzeLocalPatterns', () => {
  it('detects generalizations and lists problematic words', () => {
    const sample = 'Todos los ingenieros siempre obtienen un resultado perfecto y jamás fallan en cada proyecto crítico.';

    const biases = biasService.analyzeLocalPatterns(sample);

    const generalization = biases.find((bias) => bias.type === 'generalización');
    expect(generalization).toBeDefined();
    expect(generalization.palabrasProblematicas).toEqual(expect.arrayContaining(['todos', 'siempre', 'jamás', 'cada']));
    expect(Array.isArray(biases)).toBe(true);
    expect(biases.length).toBeGreaterThanOrEqual(1);
  });

  it('detects emotional tone when adjectives are extreme', () => {
    const emotionalSample = 'Este enfoque es terrible, horrible y deplorable para cualquier análisis serio.';
    const biases = biasService.analyzeLocalPatterns(emotionalSample);
    const emotional = biases.find((bias) => bias.type === 'emocional');
    expect(emotional).toBeDefined();
    expect(emotional.description).toContain('Lenguaje emocional');
  });

  it('identifies verifiable claims based on numeric patterns', () => {
    const factualText = 'El informe de 2024 indica que el 68% de los participantes mejoró 12 puntos en promedio.';
    expect(biasService.hasVerifiableClaims(factualText)).toBe(true);
    expect(biasService.hasVerifiableClaims('Texto sin cifras ni porcentajes')).toBe(false);
  });

  it('flags confirmation bias when no evidence is present in a long argument', () => {
    const longArgument = new Array(80).fill('la hipótesis mantiene coherencia sin respaldo verificable ni referencias').join(' ');
    const biases = biasService.analyzeLocalPatterns(longArgument);
    const confirmation = biases.find((bias) => bias.type === 'confirmación');
    expect(confirmation).toBeDefined();
    expect(confirmation.suggestion).toContain('Incluye fuentes confiables');
  });

  it('assesses quality and statistics based on severity mix', async () => {
    const biases = [
      { type: 'generalización', severity: 'alta', confidence: 0.9 },
      { type: 'polarización', severity: 'media', confidence: 0.6 },
      { type: 'emocional', severity: 'baja', confidence: 0.4 }
    ];

    const stats = biasService.generateBiasStatistics(biases);
    expect(stats.total).toBe(3);
    expect(stats.bySeverity.alta).toBe(1);
    expect(stats.byType.polarización).toBe(1);

    const quality = biasService.assessTextQuality(biases);
    expect(quality.score).toBeLessThan(90);
    expect(['aceptable', 'necesita mejoras', 'problemático']).toContain(quality.level);
  });
});
