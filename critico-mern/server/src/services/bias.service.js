const axios = require('axios');
const Bias = require('../models/Bias');

class BiasService {
  constructor() {
    this.factCheckApiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
    this.factCheckUrl = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';
  }

  async analyzeBiasesAndSave(text, relatedTo, relatedId, userId) {
    try {
      await Bias.deleteMany({ relatedTo, relatedId });

      if (!this.factCheckApiKey) {
        throw new Error('Google Fact Check API key no configurada');
      }

      const biasesData = await this.checkFactsWithGoogle(text);

      const savedBiases = [];
      for (const biasData of biasesData) {
        const bias = new Bias({
          relatedTo,
          relatedId,
          analyzedBy: userId,
          ...biasData
        });
        await bias.save();
        savedBiases.push(bias);
      }

      const statistics = await Bias.getStatistics(relatedTo, relatedId);
      const quality = await Bias.assessQuality(relatedTo, relatedId);

      return {
        biases: savedBiases,
        statistics,
        quality
      };
    } catch (error) {
      console.error('Error al analizar y guardar sesgos:', error);
      throw error;
    }
  }

  async getBiases(relatedTo, relatedId) {
    try {
      const biases = await Bias.find({ relatedTo, relatedId })
        .sort({ severity: -1, confidence: -1 });
      
      const statistics = await Bias.getStatistics(relatedTo, relatedId);
      const quality = await Bias.assessQuality(relatedTo, relatedId);

      return { biases, statistics, quality };
    } catch (error) {
      console.error('Error al obtener sesgos:', error);
      throw error;
    }
  }

  async resolveBias(biasId, note) {
    try {
      const bias = await Bias.findById(biasId);
      if (!bias) {
        throw new Error('Sesgo no encontrado');
      }

      bias.resolved = true;
      bias.resolvedAt = new Date();
      bias.resolvedNote = note;
      await bias.save();

      return bias;
    } catch (error) {
      console.error('Error al resolver sesgo:', error);
      throw error;
    }
  }

  async analyzeBiases(text) {
    const allBiases = [];

    console.log('🧠 Analizando sesgos de pensamiento crítico (análisis local)...');
    const localBiases = this.analyzeLocalPatterns(text);
    allBiases.push(...localBiases);
    console.log(`   ✅ ${localBiases.length} sesgo(s) cognitivos detectados`);

    const hasVerifiableClaims = this.hasVerifiableClaims(text);
    
    if (hasVerifiableClaims && process.env.GOOGLE_FACT_CHECK_API_KEY) {
      console.log('🔍 Verificando hechos con Google Fact Check API...');
      try {
        const googleBiases = await this.checkFactsWithGoogle(text);
        allBiases.push(...googleBiases);
        console.log(`   ✅ ${googleBiases.length} problema(s) de verificación detectados`);
      } catch (error) {
        console.log('   ⚠️  Google API no disponible:', error.message);
      }
    } else if (!hasVerifiableClaims) {
      console.log('   ℹ️  No se detectaron claims verificables para Google API');
    }
    
    console.log(`✅ TOTAL: ${allBiases.length} sesgo(s) detectado(s)`);
    return allBiases;
  }

  hasVerifiableClaims(text) {
    const verifiablePatterns = [
      /\d+%/g,                          
      /\d+\s*(millones?|miles?|billones?)/gi, 
      /en\s+\d{4}/g,                    
      /según\s+\w+/gi,                  
      /estudios?\s+(muestran?|revelan?|indican?)/gi,
      /datos?\s+de/gi,
      /estadísticas?\s/gi,
      /investigación\s+de/gi
    ];
    
    return verifiablePatterns.some(pattern => pattern.test(text));
  }

  generateBiasStatistics(biases) {
    const stats = {
      total: biases.length,
      byType: {},
      bySeverity: { alta: 0, media: 0, baja: 0 },
      averageConfidence: 0,
      mostCommonType: null
    };

    if (biases.length === 0) return stats;

    let totalConfidence = 0;
    let maxTypeCount = 0;
    
    biases.forEach(bias => {
      const type = bias.type || 'otro';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      if (stats.byType[type] > maxTypeCount) {
        maxTypeCount = stats.byType[type];
        stats.mostCommonType = type;
      }
      
      const severity = bias.severity || 'media';
      stats.bySeverity[severity]++;
      
      totalConfidence += (bias.confidence || 0);
    });

    stats.averageConfidence = totalConfidence / biases.length;

    return stats;
  }

  assessTextQuality(biases) {
    if (biases.length === 0) {
      return {
        level: 'excelente',
        score: 100,
        message: 'El texto muestra un excelente nivel de objetividad'
      };
    }

    const stats = this.generateBiasStatistics(biases);
    const highSeverity = stats.bySeverity.alta || 0;
    const mediumSeverity = stats.bySeverity.media || 0;
    
    let score = 100;
    score -= (highSeverity * 15);  
    score -= (mediumSeverity * 8);  
    score = Math.max(0, score);

    let level, message;
    if (score >= 90) {
      level = 'excelente';
      message = 'El texto es muy objetivo con sesgos mínimos';
    } else if (score >= 75) {
      level = 'bueno';
      message = 'El texto es generalmente objetivo con algunos sesgos menores';
    } else if (score >= 60) {
      level = 'aceptable';
      message = 'El texto tiene varios sesgos que podrían mejorarse';
    } else if (score >= 40) {
      level = 'necesita mejoras';
      message = 'El texto contiene múltiples sesgos significativos';
    } else {
      level = 'problemático';
      message = 'El texto requiere revisión importante por sesgos graves';
    }

    return { level, score, message, stats };
  }

  analyzeLocalPatterns(text) {
    const biases = [];
    const lowerText = text.toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const wordCount = text.split(/\s+/).length;
    
    const absolutePattern = /\b(todos?|todas?|nadie|siempre|nunca|cada|ningún[oa]?|jamás|cualquier[a]?|totalmente|completamente|absolutamente)\b/gi;
    const absoluteTerms = text.match(absolutePattern);
    
    if (absoluteTerms && absoluteTerms.length > 0) {
      const uniqueWords = [...new Set(absoluteTerms.map(t => t.toLowerCase()))];
      
      const contexts = [];
      const regex = new RegExp(`\\b(todos?|todas?|nadie|siempre|nunca|cada|ningún[oa]?|jamás|cualquier[a]?|totalmente|completamente|absolutamente)\\b`, 'gi');
      let match;
      let count = 0;
      
      while ((match = regex.exec(text)) !== null && count < 3) {
        const start = Math.max(0, match.index - 30);
        const end = Math.min(text.length, match.index + match[0].length + 30);
        const context = text.substring(start, end).trim();
        contexts.push(`"...${context}..."`);
        count++;
      }
      
      const wordsString = uniqueWords.map(w => `"${w}"`).join(', ');
      
      biases.push({
        type: 'generalización',
        confidence: Math.min(0.65 + (absoluteTerms.length * 0.08), 0.95),
        description: `Uso excesivo de términos absolutos (${absoluteTerms.length} ocurrencias): ${contexts.join(' | ')}`,
        location: `${absoluteTerms.length} término(s) detectado(s): ${wordsString}`,
        suggestion: 'Evita generalizaciones. Usa términos más precisos: "algunos", "muchos", "frecuentemente", "la mayoría", "en muchos casos"',
        severity: 'alta',
        source: 'Patrón local: Generalización absoluta',
        palabrasProblematicas: uniqueWords
      });
    }
    
    const emotionalWords = text.match(/\b(odio|odiar|amo|amar|terrible|perfecto|perfecta|horrible|maravilloso|increíble|espantoso|fantástico|pésimo|pésima|deplorable|excelente|magnífico|desastroso|catastrófico)\b/gi);
    if (emotionalWords && emotionalWords.length > 1) {
      biases.push({
        type: 'emocional',
        confidence: Math.min(0.55 + (emotionalWords.length * 0.12), 0.92),
        description: `Lenguaje emocional/subjetivo: "${emotionalWords.slice(0, 4).join('", "')}"`,
        location: `${emotionalWords.length} término(s) emocionales`,
        suggestion: 'Usa lenguaje más neutral y descriptivo. Sustituye adjetivos extremos por descripciones objetivas',
        severity: 'media',
        source: 'Patrón local: Lenguaje emocional'
      });
    }
    
    const evidenceMarkers = text.match(/\b(según|de acuerdo con|estudios?|estudio de|investigación|investigaciones|fuente|fuentes|datos?|estadística|estadísticas|informe|informes|experto|expertos|investigador|análisis|encuesta)\b/gi);
    const hasEvidence = evidenceMarkers && evidenceMarkers.length > 0;
    
    if (!hasEvidence && wordCount > 60) {
      biases.push({
        type: 'confirmación',
        confidence: 0.70,
        description: 'Texto carece de referencias, fuentes o evidencia empírica',
        location: 'Todo el texto',
        suggestion: 'Incluye fuentes confiables, estudios, datos o referencias que respalden las afirmaciones. Ej: "Según un estudio de...", "Los datos de... muestran que..."',
        severity: 'alta',
        source: 'Patrón local: Falta de evidencia'
      });
    }
    
    const polarizedWords = text.match(/\b(obviamente|claramente|indudablemente|sin duda|evidentemente|es obvio que|está claro que|es indiscutible|no hay duda|por supuesto|definitivamente)\b/gi);
    if (polarizedWords && polarizedWords.length > 0) {
      biases.push({
        type: 'polarización',
        confidence: 0.72,
        description: 'Lenguaje que presenta opiniones como hechos indiscutibles',
        location: `Detectado en: "${polarizedWords.slice(0, 3).join('", "')}"`,
        suggestion: 'Presenta argumentos de forma más matizada. Reconoce perspectivas alternativas o limitaciones del conocimiento',
        severity: 'media',
        source: 'Patrón local: Polarización'
      });
    }
    
    const attackWords = text.match(/\b(idiota|idiotas|estúpido|estúpida|tonto|tonta|incompetente|corrupto|corrupta|mentiroso|mentirosa|imbécil|ignorante|ignorantes|mediocre|inútil)\b/gi);
    if (attackWords && attackWords.length > 0) {
      biases.push({
        type: 'ad hominem',
        confidence: 0.85,
        description: 'Ataque personal en lugar de refutar argumentos o ideas',
        location: `Términos descalificativos: "${attackWords.join('", "')}"`,
        suggestion: 'Enfócate en criticar las IDEAS, no las personas. Argumenta sobre acciones o posturas, no sobre características personales',
        severity: 'alta',
        source: 'Patrón local: Ad hominem'
      });
    }
    
    const selectiveWords = text.match(/\b(solo|sólo|únicamente|exclusivamente|solamente|nada más|tan solo)\b/gi);
    if (selectiveWords && selectiveWords.length > 2 && !hasEvidence) {
      biases.push({
        type: 'selección',
        confidence: 0.62,
        description: 'Posible enfoque selectivo que ignora factores relevantes',
        location: `${selectiveWords.length} uso(s) de términos limitantes`,
        suggestion: 'Considera mencionar otros factores, variables o perspectivas que también sean relevantes al tema',
        severity: 'media',
        source: 'Patrón local: Sesgo de selección'
      });
    }
    
    const dichotomyPatterns = text.match(/\b(o\s+\w+\s+o\s+\w+|blanco o negro|bueno o malo|correcto o incorrecto|todo o nada|conmigo o contra mí)\b/gi);
    if (dichotomyPatterns && dichotomyPatterns.length > 1) {
      biases.push({
        type: 'dicotomía',
        confidence: 0.68,
        description: 'Presenta opciones como binarias cuando puede haber matices',
        location: `Detectado en: "${dichotomyPatterns.slice(0, 2).join('", "')}"`,
        suggestion: 'Reconoce que muchos temas tienen múltiples perspectivas o posiciones intermedias válidas',
        severity: 'media',
        source: 'Patrón local: Falsa dicotomía'
      });
    }
    
    const authorityAppeal = text.match(/\b(siempre se ha hecho así|desde siempre|es tradición|históricamente|todo el mundo sabe|es de sentido común)\b/gi);
    if (authorityAppeal && authorityAppeal.length > 0) {
      biases.push({
        type: 'autoridad',
        confidence: 0.65,
        description: 'Apelación a la tradición o autoridad sin evidencia',
        location: `Frases: "${authorityAppeal.slice(0, 2).join('", "')}"`,
        suggestion: 'Justifica con argumentos lógicos o evidencia, no solo con "siempre ha sido así" o "todo el mundo lo sabe"',
        severity: 'media',
        source: 'Patrón local: Apelación infundada'
      });
    }
    
    const slopePatterns = text.match(/\b(si\s+\w+\s+entonces|esto llevará a|terminará en|el siguiente paso será|inevitablemente)\b/gi);
    const hasCausalChain = slopePatterns && slopePatterns.length > 2 && !hasEvidence;
    if (hasCausalChain) {
      biases.push({
        type: 'pendiente resbaladiza',
        confidence: 0.60,
        description: 'Cadena causal sin justificación que predice consecuencias extremas',
        location: 'Predicciones no fundamentadas',
        suggestion: 'Justifica cada paso de la cadena causal con evidencia. No asumas que una acción inevitablemente llevará a consecuencias extremas',
        severity: 'media',
        source: 'Patrón local: Pendiente resbaladiza'
      });
    }
    
    const exclamations = (text.match(/!/g) || []).length;
    if (exclamations > 3 && sentences.length < 10) {
      biases.push({
        type: 'tono emocional',
        confidence: 0.58,
        description: `Uso excesivo de signos de exclamación (${exclamations} en ${sentences.length} oraciones)`,
        location: 'Múltiples ubicaciones',
        suggestion: 'Reduce el uso de signos de exclamación para mantener un tono más académico y objetivo',
        severity: 'baja',
        source: 'Patrón local: Tono emocional'
      });
    }
    
    return biases;
  }

  async checkFactsWithGoogle(text) {
    if (!this.factCheckApiKey) {
      throw new Error('Google Fact Check API key no configurada');
    }

    try {
      const biases = [];
      
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      
      const significantSentences = sentences
        .filter(s => s.split(/\s+/).length >= 5)
        .slice(0, 5); 
      
      console.log(`🔍 Analizando ${significantSentences.length} oraciones con Google Fact Check API...`);
      
      for (const sentence of significantSentences) {
        try {
          const query = sentence.trim().substring(0, 250);
          
          const response = await axios.get(this.factCheckUrl, {
            params: {
              key: this.factCheckApiKey,
              query: query,
              languageCode: 'es'
            },
            timeout: 8000
          });
          
          if (response.data.claims && response.data.claims.length > 0) {
            for (const claim of response.data.claims.slice(0, 2)) { 
              const reviews = claim.claimReview || [];
              
              for (const review of reviews) {
                const rating = review.textualRating?.toLowerCase() || '';
                const publisherName = review.publisher?.name || 'Fuente de verificación';
                
                let severity = 'media';
                let biasType = 'información cuestionable';
                
                if (rating.includes('false') || rating.includes('falso') || rating.includes('incorrect')) {
                  severity = 'alta';
                  biasType = 'desinformación verificada';
                } else if (rating.includes('misleading') || rating.includes('engañoso') || rating.includes('parcialmente')) {
                  severity = 'media';
                  biasType = 'información engañosa';
                } else if (rating.includes('unproven') || rating.includes('sin verificar')) {
                  severity = 'baja';
                  biasType = 'información no verificada';
                }
                
                const isProblematic = severity === 'alta' || severity === 'media';
                
                if (isProblematic) {
                  biases.push({
                    type: 'desinformación',
                    confidence: severity === 'alta' ? 0.95 : 0.75,
                    description: `${biasType}: "${claim.text?.substring(0, 150)}${claim.text?.length > 150 ? '...' : ''}"`,
                    location: `Verificado por ${publisherName}`,
                    suggestion: `Calificación: "${review.textualRating}". Revisa la verificación completa para más detalles y considera reescribir o eliminar esta afirmación.`,
                    severity: severity,
                    factCheckUrl: review.url,
                    source: publisherName
                  });
                  
                  console.log(`⚠️ Sesgo detectado: ${biasType} - ${claim.text?.substring(0, 50)}...`);
                }
              }
            }
          }
        } catch (apiError) {
          if (apiError.response?.status === 429) {
            console.warn('⚠️ Límite de tasa de Google Fact Check alcanzado, esperando...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }
      }
      
      console.log(`✅ Análisis completado: ${biases.length} sesgo(s) detectado(s)`);
      return biases;
    } catch (error) {
      console.error('❌ Error en Google Fact Check:', error.message);
      throw error;
    }
  }

  async generateImprovementPrompt(relatedTo, relatedId, additionalInstructions = '') {
    try {
      const { biases } = await this.getBiases(relatedTo, relatedId);
      
      if (biases.length === 0) {
        return null;
      }

      let prompt = `Eres un experto en redacción objetiva y pensamiento crítico. Mejora el siguiente texto eliminando los sesgos detectados, manteniendo el mensaje principal pero con mayor objetividad y balance.\n\n`;
      
      prompt += `SESGOS DETECTADOS (${biases.length}):\n`;
      biases.forEach((bias, index) => {
        prompt += `${index + 1}. ${bias.type.toUpperCase()} (${Math.round(bias.confidence * 100)}% confianza) - Severidad: ${bias.severity}\n`;
        prompt += `   Problema: ${bias.description}\n`;
        prompt += `   Mejora sugerida: ${bias.suggestion}\n\n`;
      });
      
      prompt += `INSTRUCCIONES PARA REESCRIBIR:\n`;
      prompt += `1. Elimina generalizaciones usando términos más específicos y matizados\n`;
      prompt += `2. Reduce el lenguaje emocional manteniendo un tono neutral\n`;
      prompt += `3. Agrega perspectivas múltiples cuando sea apropiado\n`;
      prompt += `4. Si faltan fuentes, indica dónde sería apropiado citarlas\n`;
      prompt += `5. Reemplaza términos absolutos por expresiones más precisas\n`;
      prompt += `6. Mantén la estructura y longitud similar al original\n`;
      prompt += `7. Conserva el mensaje central pero expresado con mayor objetividad\n\n`;
      
      if (additionalInstructions) {
        prompt += `INSTRUCCIONES ADICIONALES DEL DOCENTE:\n${additionalInstructions}\n\n`;
      }
      
      prompt += `Proporciona SOLO el texto mejorado sin explicaciones adicionales:`;
      
      return prompt;
    } catch (error) {
      console.error('Error al generar prompt de mejora:', error);
      throw error;
    }
  }

  async getCourseStatistics(courseId) {
    try {
      const Text = require('../models/Text');
      const texts = await Text.find({ course: courseId }).select('_id');
      const textIds = texts.map(t => t._id);

      const biases = await Bias.find({
        relatedTo: 'text',
        relatedId: { $in: textIds }
      });

      const stats = {
        totalTexts: texts.length,
        textsWithBiases: new Set(biases.map(b => b.relatedId.toString())).size,
        totalBiases: biases.length,
        byType: {},
        bySeverity: { alta: 0, media: 0, baja: 0 },
        resolved: 0,
        pending: 0
      };

      biases.forEach(bias => {
        stats.byType[bias.type] = (stats.byType[bias.type] || 0) + 1;
        stats.bySeverity[bias.severity]++;
        if (bias.resolved) {
          stats.resolved++;
        } else {
          stats.pending++;
        }
      });

      stats.mostCommonBias = Object.entries(stats.byType)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return stats;
    } catch (error) {
      console.error('Error al obtener estadísticas del curso:', error);
      throw error;
    }
  }

  async analyzeStudentAnswer(studentAnswer, question, textContext = '') {
    const biases = [];
    const lowerAnswer = studentAnswer.toLowerCase();
    const sentences = studentAnswer.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const questionType = this.normalizeQuestionType(question?.tipo);
    const normalizedQuestion = question ? { ...question, tipo: questionType } : { tipo: questionType };
    const wordPattern = /\b[a-záéíóúñ]{3,}\b/gi;
    const validWords = (studentAnswer.match(wordPattern) || []);
    const totalChars = studentAnswer.trim().length;
    const repetitionPattern = /(.)\1{4,}/g; 
    const hasExcessiveRepetition = repetitionPattern.test(studentAnswer);
    const randomPattern = /^[a-z]{2,}[a-z]{2,}[a-z]{2,}/i; 
    const coherentCharsRatio = validWords.join('').length / Math.max(totalChars, 1);
    const isGarbageResponse = hasExcessiveRepetition || coherentCharsRatio < 0.3 || validWords.length === 0;
    
    if (isGarbageResponse && totalChars > 10) {
      biases.push({
        type: 'respuesta_invalida',
        tag: '[S-INVALID]',
        confidence: 0.95,
        severity: 'crítica',
        description: 'Respuesta sin contenido válido (caracteres aleatorios o sin sentido)',
        location: 'Respuesta completa',
        suggestion: 'Escribe una respuesta coherente con palabras relacionadas a la pregunta y al texto base',
        impact: 'Imposible evaluar comprensión sin contenido válido',
        scoreImpact: 12 
      });
    }
    
    const absolutePattern = /\b(todos?|todas?|nadie|siempre|nunca|cada|ningún[oa]?|jamás|cualquier[a]?|totalmente|completamente|absolutamente)\b/gi;
    const absoluteTerms = studentAnswer.match(absolutePattern);
    
    if (absoluteTerms && absoluteTerms.length > 0) {
      const uniqueWords = [...new Set(absoluteTerms.map(t => t.toLowerCase()))];
      
      biases.push({
        type: 'generalización',
        tag: '[S-GEN]',
        confidence: 0.85,
        severity: 'alta',
        description: `Uso de términos absolutos sin evidencia (${absoluteTerms.length} ocurrencias)`,
        location: `Palabras detectadas: ${uniqueWords.join(', ')}`,
        suggestion: 'Matiza tus afirmaciones. Usa "frecuentemente", "la mayoría", "muchos casos" en lugar de absolutos',
        impact: 'La generalización sin respaldo debilita tu argumentación académica',
        palabrasProblematicas: uniqueWords
      });
    }

    const polarizedPatterns = [
      /\b(bueno|malo)\b/gi,
      /\b(correcto|incorrecto)\b/gi,
      /\b(perfecto|terrible)\b/gi,
      /\b(mejor|peor)\b/gi
    ];
    
    let polarizedCount = 0;
    polarizedPatterns.forEach(pattern => {
      const matches = studentAnswer.match(pattern);
      if (matches) polarizedCount += matches.length;
    });
    
    if (polarizedCount >= 2) {
      biases.push({
        type: 'polarización',
        tag: '[S-POL]',
        confidence: 0.70,
        severity: 'media',
        description: 'Juicios binarios sin matiz o análisis comparativo',
        location: `${polarizedCount} términos polarizados`,
        suggestion: 'Evita clasificaciones absolutas. Explica contextos, matices y excepciones',
        impact: 'El pensamiento crítico requiere análisis más allá de bueno/malo'
      });
    }

    const causalityPatterns = [
      /\bporque\b/gi,
      /\bya que\b/gi,
      /\bdebido a\b/gi,
      /\bcausa\b/gi,
      /\bprovoca\b/gi,
      /\bgenera\b/gi
    ];
    
    let causalClaims = 0;
    causalityPatterns.forEach(pattern => {
      const matches = studentAnswer.match(pattern);
      if (matches) causalClaims += matches.length;
    });
    
    const hasEvidence = /\b(según|datos?|estudio|investigación|ejemplo|caso|porcentaje|\d+%)\b/gi.test(studentAnswer);
    
    if (causalClaims >= 2 && !hasEvidence) {
      biases.push({
        type: 'causalidad_sin_apoyo',
        tag: '[S-CAU]',
        confidence: 0.75,
        severity: 'alta',
        description: 'Relaciones causa-efecto sin evidencia o fuente',
        location: `${causalClaims} afirmaciones causales sin respaldo`,
        suggestion: 'Respalda tus afirmaciones causales con datos, ejemplos del texto o fuentes verificables',
        impact: 'Las afirmaciones causales requieren evidencia para ser válidas académicamente'
      });
    }

    if (textContext && textContext.length > 100) {
      const keyTermsPattern = /\b[A-ZÁ-Ú][a-zá-ú]{4,}\b/g;
      const textKeyTerms = textContext.match(keyTermsPattern) || [];
      const uniqueKeyTerms = [...new Set(textKeyTerms.slice(0, 20))]; 
      const mentionedTerms = uniqueKeyTerms.filter(term => 
        new RegExp(`\\b${term}\\b`, 'i').test(studentAnswer)
      );
      
      if (mentionedTerms.length < 2 && uniqueKeyTerms.length > 5) {
        const coverageRatio = uniqueKeyTerms.length > 0 
          ? mentionedTerms.length / uniqueKeyTerms.length 
          : 0;
        const hasZeroCoverage = mentionedTerms.length === 0;
        const severity = hasZeroCoverage ? 'alta' : 'media';
        const scoreImpact = hasZeroCoverage ? 8 : 4;
        const description = hasZeroCoverage
          ? 'La respuesta ignora por completo los conceptos clave del texto base'
          : 'Respuesta no integra suficientes conceptos clave del texto base';

        biases.push({
          type: 'lectura_parcial',
          tag: '[S-LECT]',
          confidence: hasZeroCoverage ? 0.7 : 0.65,
          severity,
          description,
          location: 'Respuesta completa',
          suggestion: `Revisa el texto y usa términos como: ${uniqueKeyTerms.slice(0, 5).join(', ')}`,
          impact: 'Demostrar comprensión del texto requiere usar sus conceptos principales',
          scoreImpact,
          coverageRatio: Number(coverageRatio.toFixed(2)),
          conceptosClaveDetectados: mentionedTerms
        });
      }
    }

    if (questionType === 'inferencia') {
      const hasInferenceMarkers = /\b(deduzco|interpreto|sugiere|implica|se puede concluir|esto significa)\b/gi.test(studentAnswer);
      
      if (!hasInferenceMarkers && studentAnswer.length > 50) {
        biases.push({
          type: 'inferencia_debil',
          tag: '[S-INF]',
          confidence: 0.70,
          severity: 'media',
          description: 'Pregunta de inferencia respondida de forma literal',
          location: 'Falta razonamiento deductivo',
          suggestion: 'Usa marcadores de inferencia: "esto sugiere que...", "se puede deducir que...", "implica que..."',
          impact: 'Las preguntas de inferencia requieren ir más allá de lo explícito'
        });
      }
    }

    if (questionType === 'crítica') {
      const hasCriticalMarkers = /\b(evalúo|considero|argumento|sin embargo|por otro lado|ventaja|desventaja|limitación)\b/gi.test(studentAnswer);
      
      if (!hasCriticalMarkers && studentAnswer.length > 50) {
        biases.push({
          type: 'critica_superficial',
          tag: '[S-CRIT]',
          confidence: 0.75,
          severity: 'alta',
          description: 'Pregunta crítica sin argumentación o análisis profundo',
          location: 'Falta desarrollo crítico',
          suggestion: 'Desarrolla tu análisis crítico: compara, evalúa ventajas/desventajas, identifica limitaciones',
          impact: 'El pensamiento crítico requiere argumentación razonada, no solo descripción'
        });
      }
    }

    if (questionType === 'aplicación') {
      const hasApplicationMarkers = /\b(aplico|transferir|caso|ejemplo|situación|contexto nuevo|adaptaría)\b/gi.test(studentAnswer);
      
      if (!hasApplicationMarkers && studentAnswer.length > 50) {
        biases.push({
          type: 'aplicacion_limitada',
          tag: '[S-APL]',
          confidence: 0.70,
          severity: 'media',
          description: 'Pregunta de aplicación sin transferencia a caso nuevo',
          location: 'Falta ejemplo de aplicación',
          suggestion: 'Muestra cómo aplicarías el concepto a un caso concreto diferente al del texto',
          impact: 'Aplicar conocimiento demuestra comprensión profunda'
        });
      }
    }

    if (normalizedQuestion && normalizedQuestion.pregunta) {
      const questionVerbs = ['explica', 'define', 'compara', 'evalúa', 'analiza', 'justifica', 'describe', 'identifica'];
      const verbFound = questionVerbs.find(verb => normalizedQuestion.pregunta.toLowerCase().includes(verb));
      
      if (verbFound) {
        const answerAddresses = new RegExp(`\\b${verbFound}\\b`, 'i').test(studentAnswer.slice(0, 100));
        
        if (!answerAddresses && studentAnswer.length > 30) {
          biases.push({
            type: 'desalineacion',
            tag: '[S-FOCO]',
            confidence: 0.65,
            severity: 'alta',
            description: `La pregunta pide "${verbFound}" pero la respuesta no lo aborda directamente`,
            location: 'Estructura de la respuesta',
            suggestion: `Enfoca tu respuesta en ${verbFound} específicamente lo que se pregunta`,
            impact: 'Responder fuera de foco reduce significativamente la calificación'
          });
        }
      }
    }

    const statistics = this.generateBiasStatistics(biases);
    
    let score = 12;
    
    const severityPenalty = {
      crítica: 12,  
      alta: 4,
      media: 2.5,
      baja: 1
    };

    biases.forEach(bias => {
      const penalty = bias.scoreImpact ?? severityPenalty[bias.severity] ?? 2.5;
      score -= penalty;
    });

    if (biases.length > 0) {
      score -= 0.5; 
    }
    
    score = Math.max(0, Math.round(score * 10) / 10);

    let nivel, mensaje;
    if (score === 0) {
      nivel = 'inválido';
      mensaje = 'Respuesta sin contenido válido o comprensible';
    } else if (score >= 10) {
      nivel = 'excelente';
      mensaje = 'Respuesta bien argumentada con mínimos sesgos';
    } else if (score >= 8) {
      nivel = 'bueno';
      mensaje = 'Respuesta sólida con algunos aspectos a mejorar';
    } else if (score >= 6) {
      nivel = 'aceptable';
      mensaje = 'Respuesta muestra comprensión pero requiere más desarrollo';
    } else if (score >= 4) {
      nivel = 'necesita_mejora';
      mensaje = 'Respuesta con varios sesgos que afectan la calidad académica';
    } else {
      nivel = 'insuficiente';
      mensaje = 'Respuesta requiere revisión profunda y más evidencia';
    }

    return {
      biases,
      statistics,
      score,
      maxScore: 12,
      nivel,
      mensaje,
      recomendaciones: this.generateStudentRecommendations(biases, normalizedQuestion)
    };
  }

  generateStudentRecommendations(biases, question) {
    const recommendations = [];
    
    if (biases.length === 0) {
      return ['¡Excelente! Tu respuesta muestra pensamiento crítico y está bien fundamentada.'];
    }

    const byType = {};
    biases.forEach(bias => {
      if (!byType[bias.type]) byType[bias.type] = [];
      byType[bias.type].push(bias);
    });

    if (byType.generalización) {
      recommendations.push('🎯 Matiza tus afirmaciones: Evita términos absolutos y cuantifica cuando sea posible.');
    }

    if (byType.causalidad_sin_apoyo) {
      recommendations.push('📊 Respalda tus afirmaciones: Incluye datos, ejemplos o referencias del texto.');
    }

    if (byType.critica_superficial || byType.inferencia_debil) {
      recommendations.push('🧠 Profundiza tu análisis: Ve más allá de la descripción, argumenta y evalúa.');
    }

    if (byType.lectura_parcial) {
      recommendations.push('📖 Revisa el texto base: Integra conceptos clave en tu respuesta.');
    }

    if (byType.desalineacion) {
      recommendations.push('🎯 Enfócate en la pregunta: Asegúrate de responder exactamente lo que se pide.');
    }

    const questionType = this.normalizeQuestionType(question?.tipo);

    if (questionType) {
      const typeMessages = {
        literal: 'Las preguntas literales requieren precisión y referencias directas al texto.',
        inferencia: 'Las preguntas de inferencia necesitan razonamiento lógico más allá de lo explícito.',
        crítica: 'Las preguntas críticas demandan argumentación, comparación y evaluación razonada.',
        aplicación: 'Las preguntas de aplicación buscan que transfieras el concepto a nuevos contextos.'
      };
      
      if (typeMessages[questionType]) {
        recommendations.push(`💡 Recuerda: ${typeMessages[questionType]}`);
      }
    }

    return recommendations;
  }

  normalizeQuestionType(rawType) {
    if (!rawType) {
      return 'literal';
    }

    const normalized = rawType.toString().trim().toLowerCase();
    const withoutAccents = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    switch (withoutAccents) {
      case 'literal':
        return 'literal';
      case 'inferencial':
      case 'inferencia':
        return 'inferencia';
      case 'critica':
        return 'crítica';
      case 'aplicacion':
        return 'aplicación';
      default:
        return rawType;
    }
  }

  parseDidacticReport(reportText = '') {
    const clean = typeof reportText === 'string' ? reportText : '';
    const lines = clean.split(/\r?\n/);
    const normalize = (text) => text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const findIndex = (header) => lines.findIndex(line => normalize(line) === normalize(header));

    const examplesIdx = findIndex('Ejemplos claros y precisos');
    const glossaryIdx = findIndex('Glosario breve');
    const questionsIdx = findIndex('Preguntas para reforzar');

    const textEnd = examplesIdx > -1 ? examplesIdx : (glossaryIdx > -1 ? glossaryIdx : (questionsIdx > -1 ? questionsIdx : lines.length));
    const textLines = lines.slice(0, textEnd).join('\n').trim();
    const paragraphs = textLines ? textLines.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];

    const sliceSection = (startIdx, endIdx) => {
      if (startIdx === -1) return [];
      const start = startIdx + 1;
      const end = endIdx > -1 ? endIdx : lines.length;
      return lines.slice(start, end).map(line => line.trim()).filter(line => line.length > 0);
    };

    const examplesRaw = sliceSection(examplesIdx, glossaryIdx === -1 ? (questionsIdx === -1 ? lines.length : questionsIdx) : glossaryIdx);
    const glossaryRaw = sliceSection(glossaryIdx, questionsIdx === -1 ? lines.length : questionsIdx);
    const questionsRaw = sliceSection(questionsIdx, -1);

    const groupNumbered = (items) => {
      const results = [];
      let current = '';
      items.forEach(line => {
        if (/^\d+[\).\-]/.test(line) || /^\d+\s/.test(line)) {
          if (current) results.push(current.trim());
          current = line;
        } else if (current) {
          current += ` ${line}`;
        } else {
          current = line;
        }
      });
      if (current) results.push(current.trim());
      return results;
    };

    const examples = groupNumbered(examplesRaw);
    const questions = questionsRaw.map(line => line.replace(/^\d+[\).\-]\s*/, '').trim()).filter(Boolean);

    const glossary = glossaryRaw.map(line => line.replace(/^[-•]\s*/, '').trim());

    return {
      raw: clean,
      text: textLines,
      paragraphs,
      examples,
      glossary,
      questions
    };
  }
}

module.exports = new BiasService();
