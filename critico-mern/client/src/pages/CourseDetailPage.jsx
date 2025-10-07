import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import './CourseDetailPage.css';

const defaultTopic = {
  title: '',
  description: '',
  order: 1,
  releaseDate: '',
  dueDate: '',
  objectives: []
};

const objectiveOptions = [
  'inference',
  'evidence',
  'counterargument',
  'bias-detection',
  'synthesis'
];

const defaultGenerateForm = {
  theme: '',
  targetAudience: '',
  difficulty: 'intermedio',
  educationalPurpose: 'aplicar',
  startYear: '2020',
  endYear: '2025',
  language: 'español'
};

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState(defaultGenerateForm);
  const [generateModalError, setGenerateModalError] = useState(null);
  const [showTextsModal, setShowTextsModal] = useState(false);
  const [showTextDetailModal, setShowTextDetailModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showGenerateQuestionsModal, setShowGenerateQuestionsModal] = useState(false);
  const [generateModalStep, setGenerateModalStep] = useState(1);
  const [selectedTopicForGenerate, setSelectedTopicForGenerate] = useState(null);
  const [selectedTopicForTexts, setSelectedTopicForTexts] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [textQuestions, setTextQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [topicTexts, setTopicTexts] = useState([]);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState(defaultTopic);

  const [showManualTextModal, setShowManualTextModal] = useState(false);
  const [editingText, setEditingText] = useState(null);
  const [manualTextForm, setManualTextForm] = useState({
    title: '',
    content: '',
    source: '',
    difficulty: 'intermedio',
    estimatedTime: 15
  });
  const [savingText, setSavingText] = useState(false);

  const [showManualQuestionModal, setShowManualQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [manualQuestionForm, setManualQuestionForm] = useState({
    prompt: '',
    type: 'open-ended',
    skill: 'inferencial',
    options: []
  });
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [generateQuestionsStep, setGenerateQuestionsStep] = useState('preview');
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [questionsCorrections, setQuestionsCorrections] = useState('');
  const [questionsGenerating, setQuestionsGenerating] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);

  const [showGenerateTextModal, setShowGenerateTextModal] = useState(false);
  const [generateTextStep, setGenerateTextStep] = useState('config');
  const [generateTextForm, setGenerateTextForm] = useState({
    tema: '',
    publico: '',
    nivel: 'intermedio',
    proposito: 'aplicar',
    ventanaInicio: '2020',
    ventanaFin: '2025',
    idioma: 'español'
  });
  const [previewText, setPreviewText] = useState(null);
  const [textCorrections, setTextCorrections] = useState('');
  const [textGenerating, setTextGenerating] = useState(false);
  const [textGeneratingError, setTextGeneratingError] = useState(null);
  
  // Estados para análisis de sesgos
  const [biasesData, setBiasesData] = useState(null);
  const [analyzingBiases, setAnalyzingBiases] = useState(false);
  const [biasesError, setBiasesError] = useState(null);
  const [regeneratingWithBiases, setRegeneratingWithBiases] = useState(false);
  
  // Estados para el modal de regeneración de textos guardados
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [textToRegenerate, setTextToRegenerate] = useState(null);
  const [regenerateStep, setRegenerateStep] = useState('preview'); // 'preview', 'biases', 'regenerating'
  const [regenerateInstructions, setRegenerateInstructions] = useState('');

  const canManage = useMemo(() => user?.role === 'teacher' || user?.role === 'admin', [user]);

  const fetchCourse = async () => {
    try {
      const { data } = await client.get(`/courses/${courseId}`);
      setCourse(data);
    } catch (err) {
      console.warn('No se pudo cargar curso base', err);
      try {
        const { data: courses } = await client.get('/courses/mine');
        const match = courses.find((item) => item.id === courseId);
        setCourse(match || null);
      } catch (fallbackErr) {
        console.warn('Tampoco se pudo cargar desde la lista', fallbackErr);
      }
    }
  };

  const fetchTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.get(`/topics/course/${courseId}`);
      setTopics(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Curso no encontrado');
      } else {
        setError(err.response?.data?.message || 'No se pudieron cargar los temas');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    fetchTopics();
  }, [courseId]);

  const handleTopicChange = (evt) => {
    const { name, value } = evt.target;
    setTopicForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleObjectiveToggle = (objective) => {
    setTopicForm((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(objective)
        ? prev.objectives.filter((item) => item !== objective)
        : [...prev.objectives, objective]
    }));
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    try {
      if (editingTopic) {
        await client.patch(`/topics/${editingTopic.id}`, {
          ...topicForm,
          releaseDate: topicForm.releaseDate || undefined,
          dueDate: topicForm.dueDate || undefined
        });
      } else {
        await client.post(`/topics/course/${courseId}`, {
          ...topicForm,
          releaseDate: topicForm.releaseDate || undefined,
          dueDate: topicForm.dueDate || undefined
        });
      }
      handleCloseModal();
      await fetchTopics();
    } catch (err) {
      setError(err.response?.data?.message || `No se pudo ${editingTopic ? 'actualizar' : 'crear'} el tema`);
    }
  };

  const handleEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicForm({
      title: topic.title,
      description: topic.description || '',
      order: topic.order || 1,
      releaseDate: topic.releaseDate ? topic.releaseDate.split('T')[0] : '',
      dueDate: topic.dueDate ? topic.dueDate.split('T')[0] : '',
      objectives: topic.objectives || []
    });
    setShowModal(true);
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este tema? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await client.delete(`/topics/${topicId}`);
      await fetchTopics();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el tema');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTopic(null);
    setTopicForm(defaultTopic);
    setError(null);
  };

  const handleOpenGenerateModal = (topic) => {
    setSelectedTopicForGenerate(topic);
    setGenerateModalStep(1);
    setGenerateModalError(null);

    setGenerateForm(prev => ({
      ...prev,
      theme: topic.title
    }));
    setShowGenerateModal(true);
  };

  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false);
    setSelectedTopicForGenerate(null);
    setGenerateModalStep(1);
    setGenerateModalError(null);
    setGenerateForm({ ...defaultGenerateForm });
  };

  const handleContinueToForm = () => {
    setGenerateModalStep(2);
  };

  const handleBackToInfo = () => {
    setGenerateModalStep(1);
    setGenerateModalError(null);
  };

  const handleGenerateFormChange = (evt) => {
    const { name, value } = evt.target;
    setGenerateModalError(null);
    setGenerateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateText = async () => {
    if (!selectedTopicForGenerate) {
      setGenerateModalError('Selecciona un tema para continuar.');
      return;
    }

    const trimmedTheme = generateForm.theme.trim();
    const trimmedAudience = generateForm.targetAudience.trim();

    if (!trimmedTheme || !trimmedAudience) {
      setGenerateModalError('Completa los campos obligatorios (tema y público objetivo).');
      return;
    }

    const topic = selectedTopicForGenerate;
    const mappedForm = {
      tema: trimmedTheme,
      publico: trimmedAudience,
      nivel: generateForm.difficulty,
      proposito: generateForm.educationalPurpose,
      ventanaInicio: generateForm.startYear,
      ventanaFin: generateForm.endYear,
      idioma: generateForm.language
    };

    setTextGenerating(true);
    setTextGeneratingError(null);
    setGenerateModalError(null);

    try {
      const { data } = await client.post(`/texts/preview/${topic.id}`, mappedForm);

      setSelectedTopicForTexts(topic);
      setGenerateTextForm(mappedForm);
      setPreviewText(data.text);
      setTextCorrections('');
      setGenerateTextStep('preview');
      setShowGenerateTextModal(true);
      setShowGenerateModal(false);
      setGenerateModalStep(1);
    } catch (error) {
      console.error('Error generando texto:', error);
      setGenerateModalError(error.response?.data?.message || 'Error al generar el texto con IA. Intenta nuevamente.');
    } finally {
      setTextGenerating(false);
    }
  };

  const handleOpenGenerateTextModal = (topic) => {
    setSelectedTopicForTexts(topic);
    setShowGenerateTextModal(true);
    setGenerateTextStep('config');
    setPreviewText(null);
    setTextCorrections('');
    setTextGeneratingError(null);
  };

  const handleGenerateTextPreview = async () => {
    setTextGenerating(true);
    setTextGeneratingError(null);

    try {
      const payload = {
        tema: generateTextForm.tema,
        publico: generateTextForm.publico,
        nivel: generateTextForm.nivel,
        proposito: generateTextForm.proposito,
        ventanaInicio: generateTextForm.ventanaInicio,
        ventanaFin: generateTextForm.ventanaFin,
        idioma: generateTextForm.idioma,
        correcciones: textCorrections || undefined
      };

      const { data } = await client.post(`/texts/preview/${selectedTopicForTexts.id}`, payload);

      setPreviewText(data.text);
      setGenerateTextStep('preview');
    } catch (error) {
      console.error('Error generando texto:', error);
      setTextGeneratingError(error.response?.data?.message || 'Error al generar texto con IA');
    } finally {
      setTextGenerating(false);
    }
  };

  const handleApproveText = async () => {
    setTextGenerating(true);
    setTextGeneratingError(null);

    try {
      const response = await client.post(`/texts/save/${selectedTopicForTexts.id}`, previewText);
      console.log('✅ Texto guardado:', response.data);

      setShowGenerateTextModal(false);
      setPreviewText(null);
      setTextCorrections('');
      setGenerateTextStep('config');

      alert('✅ Texto guardado exitosamente');

      console.log('🔄 Recargando textos para topic:', selectedTopicForTexts.id);
      console.log('📋 Modal de textos abierto:', showTextsModal);
      await loadTextsForTopic(selectedTopicForTexts.id);
    } catch (error) {
      console.error('Error guardando texto:', error);
      setTextGeneratingError(error.response?.data?.message || 'Error al guardar texto');
    } finally {
      setTextGenerating(false);
    }
  };

  const handleAnalyzeBiases = async () => {
    if (!previewText?.content) {
      alert('No hay texto para analizar');
      return;
    }

    setAnalyzingBiases(true);
    setBiasesError(null);

    try {
      // Analizar el contenido directamente (sin necesidad de guardar)
      const { data } = await client.post('/biases/analyze-content', {
        content: previewText.content
      });
      setBiasesData(data);
      setGenerateTextStep('biases');
    } catch (error) {
      console.error('Error analizando sesgos:', error);
      setBiasesError(error.response?.data?.message || 'Error al analizar sesgos');
      alert('Error al analizar sesgos. Por favor intenta nuevamente.');
    } finally {
      setAnalyzingBiases(false);
    }
  };

  const handleRegenerateWithBiases = async () => {
    if (!previewText?.content || !biasesData?.biases) {
      alert('No hay sesgos detectados para mejorar');
      return;
    }

    setRegeneratingWithBiases(true);
    setTextGeneratingError(null);

    try {
      const problematicWords = new Set();
      const problematicContexts = [];
      const allBiasDescriptions = [];
      
      biasesData.biases.forEach(bias => {
        allBiasDescriptions.push(bias);
        
        const matches = bias.description.match(/"([^"]+)"/g);
        if (matches) {
          matches.forEach(match => {
            const word = match.replace(/"/g, '').trim().toLowerCase();
            if (word.length < 20 && !word.includes('...')) {
              problematicWords.add(word);
            }
          });
        }
        
        const contextMatches = bias.description.match(/"\.\.\.(.*?)\.\.\."/g);
        if (contextMatches && contextMatches.length > 0) {
          problematicContexts.push(...contextMatches.slice(0, 3));
        }
      });
      
      let improvementPrompt = `🚨🚨🚨 TAREA CRÍTICA: REESCRIBIR TEXTO ELIMINANDO TÉRMINOS ABSOLUTOS 🚨🚨🚨\n\n`;
      
      improvementPrompt += `⚠️ INSTRUCCIÓN PRINCIPAL:\n`;
      improvementPrompt += `Debes reescribir COMPLETAMENTE el texto de abajo, eliminando TODAS las ocurrencias de las palabras listadas.\n`;
      improvementPrompt += `NO copies el texto tal cual. DEBES modificar cada oración que contenga estas palabras.\n`;
      improvementPrompt += `El texto resultante NO PUEDE contener ninguna de estas palabras problemáticas.\n\n`;
      
      if (problematicWords.size > 0) {
        improvementPrompt += `🔴 LISTA DE PALABRAS PROHIBIDAS (DEBES ELIMINARLAS TODAS):\n`;
        const wordsArray = Array.from(problematicWords);
        
        const absoluteQuantifiers = wordsArray.filter(w => 
          ['cada', 'todo', 'todos', 'toda', 'todas', 'siempre', 'nunca', 'jamás', 'ningún', 'ninguna', 'ninguno', 'nadie', 'nada'].includes(w)
        );
        const otherWords = wordsArray.filter(w => !absoluteQuantifiers.includes(w));
        
        if (absoluteQuantifiers.length > 0) {
          improvementPrompt += `\n📊 CUANTIFICADORES ABSOLUTOS DETECTADOS:\n`;
          absoluteQuantifiers.forEach(word => {
            improvementPrompt += `   ❌ "${word}"\n`;
          });
          improvementPrompt += `\n✅ REGLAS DE REEMPLAZO OBLIGATORIAS:\n`;
          absoluteQuantifiers.forEach(word => {
            if (word === 'cada') {
              improvementPrompt += `   • "cada X" → REEMPLAZAR POR: "los X", "las X", "algunos X", "varios X", "muchos X"\n`;
            } else if (word === 'todo' || word === 'todos' || word === 'toda' || word === 'todas') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "la mayoría", "muchos", "varios", "gran parte"\n`;
            } else if (word === 'siempre') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "frecuentemente", "habitualmente", "en muchos casos", "típicamente"\n`;
            } else if (word === 'nunca' || word === 'jamás') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "raramente", "en pocos casos", "es infrecuente", "ocasionalmente no"\n`;
            } else if (word.includes('ningún') || word.includes('ninguna') || word === 'nadie' || word === 'nada') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "pocos", "algunos no", "es poco común", "en casos limitados"\n`;
            }
          });
          improvementPrompt += `\n`;
        }
        
        if (otherWords.length > 0) {
          improvementPrompt += `\n🔍 OTRAS PALABRAS PROBLEMÁTICAS DETECTADAS:\n`;
          otherWords.forEach(word => {
            improvementPrompt += `   ❌ "${word}" → ELIMINAR o usar términos más precisos y cuantificables\n`;
          });
          improvementPrompt += `\n`;
        }
        
        if (problematicContexts.length > 0) {
          improvementPrompt += `📍 EJEMPLOS DE DÓNDE APARECEN EN EL TEXTO ORIGINAL:\n`;
          problematicContexts.forEach((ctx, i) => {
            improvementPrompt += `   ${i + 1}. ${ctx}\n`;
          });
          improvementPrompt += `   ⚠️ Estas frases DEBEN ser reescritas sin las palabras prohibidas.\n\n`;
        }
      }
      
      improvementPrompt += `\n🎯 ANÁLISIS COMPLETO DE SESGOS DETECTADOS:\n`;
      allBiasDescriptions.forEach((bias, index) => {
        improvementPrompt += `${index + 1}. ${bias.type.toUpperCase()}: ${bias.description}\n`;
        improvementPrompt += `   Corrección necesaria: ${bias.suggestion}\n\n`;
      });
      
      if (textCorrections && textCorrections.trim()) {
        improvementPrompt += `\n📝 INSTRUCCIONES ADICIONALES DEL PROFESOR:\n${textCorrections}\n\n`;
      }
      
      improvementPrompt += `\n⚠️⚠️⚠️ PASOS OBLIGATORIOS PARA LA CORRECCIÓN ⚠️⚠️⚠️\n`;
      improvementPrompt += `1. Lee CADA LÍNEA del texto original\n`;
      improvementPrompt += `2. Busca CADA OCURRENCIA de las palabras de la lista de prohibidas\n`;
      improvementPrompt += `3. REESCRIBE la oración completa usando los reemplazos sugeridos\n`;
      improvementPrompt += `4. Verifica que el texto resultante NO contenga NINGUNA palabra prohibida\n`;
      improvementPrompt += `5. Mantén el formato 5×8 (5 párrafos de 8 líneas) y la estructura del contenido\n`;
      improvementPrompt += `6. Conserva los ejemplos, glosario y secciones especiales\n\n`;
      
      const payload = {
        tema: generateTextForm.tema,
        publico: generateTextForm.publico,
        nivel: generateTextForm.nivel,
        proposito: generateTextForm.proposito,
        ventanaInicio: generateTextForm.ventanaInicio,
        ventanaFin: generateTextForm.ventanaFin,
        idioma: generateTextForm.idioma,
        
        textoOriginal: previewText.content,
        
        sesgosDetectados: biasesData.biases.map(bias => ({
          tipo: bias.type,
          descripcion: bias.description,
          sugerencia: bias.suggestion,
          severidad: bias.severity,
          ubicacion: bias.location,
          palabrasProblematicas: (() => {
            const normalizedProblematic = Array.isArray(bias.problematicWords)
              ? bias.problematicWords
                  .map(word => (typeof word === 'string' ? word.trim().toLowerCase() : ''))
                  .filter(word => word.length > 0)
              : [];

            if (normalizedProblematic.length > 0) {
              return Array.from(new Set(normalizedProblematic));
            }

            if (bias.location && bias.location.includes('término(s) detectado(s):')) {
              const matches = bias.location.match(/"([^"]+)"/g);
              if (matches) {
                return Array.from(new Set(matches
                  .map(m => m.replace(/"/g, '').trim().toLowerCase())
                  .filter(w => w.length > 0)));
              }
            }
            const descMatches = bias.description.match(/"([^"]+)"/g);
            if (descMatches) {
              return Array.from(new Set(descMatches
                .map(m => m.replace(/"/g, '').trim().toLowerCase())
                .filter(w => w.length < 20 && w.length > 0 && !w.includes('...'))));
            }
            return [];
          })()
        })),
        
        instruccionesDocente: textCorrections && textCorrections.trim() 
          ? textCorrections 
          : null
      };

      console.log('📤 Payload a enviar (generación):', {
        ...payload,
        textoOriginal: payload.textoOriginal ? `${payload.textoOriginal.substring(0, 100)}...` : 'NO',
        sesgosDetectados: payload.sesgosDetectados ? `${payload.sesgosDetectados.length} sesgos` : 'NO'
      });
      console.log('📊 Detalle de sesgos:', payload.sesgosDetectados);

      const previousBiasCount = biasesData.biases.length;

      const { data } = await client.post(`/texts/preview/${selectedTopicForTexts.id}`, payload);

      setPreviewText(data.text);

      const { data: newBiasData } = await client.post('/biases/analyze-content', {
        content: data.text.content
      });
      
      const newBiasCount = newBiasData.biases.length;
      const improvement = previousBiasCount - newBiasCount;

      setBiasesData(newBiasData);

      setGenerateTextStep('preview');

      alert(`✅ Texto regenerado exitosamente!\n\n📊 Sesgos: ${previousBiasCount} → ${newBiasCount} (${improvement > 0 ? '✓ -' : ''}${Math.abs(improvement)})\n📈 Calidad: ${newBiasData.quality.score}/100 (${newBiasData.quality.level})\n\n💡 Puedes volver a analizar sesgos para verificar las mejoras`);
      
      setTextCorrections('');
    } catch (error) {
      console.error('Error regenerando texto:', error);
      setTextGeneratingError(error.response?.data?.message || 'Error al regenerar texto');
      alert('Error al regenerar texto. Por favor intenta nuevamente.');
    } finally {
      setRegeneratingWithBiases(false);
    }
  };

  const handleRequestCorrections = () => {
    setGenerateTextStep('corrections');
  };

  const handleBackToPreview = () => {
    setGenerateTextStep('preview');
  };

  const handleBackToBiases = () => {
    setGenerateTextStep('biases');
  };

  const handleCloseGenerateTextModal = () => {
    setShowGenerateTextModal(false);
    setPreviewText(null);
    setTextCorrections('');
    setGenerateTextStep('config');
    setBiasesData(null);
    setBiasesError(null);
  };

  const loadTextsForTopic = async (topicId) => {
    setLoadingTexts(true);
    try {
      const { data } = await client.get(`/texts/topic/${topicId}`);
      console.log(`📚 Textos cargados para topic ${topicId}:`, data);
      console.log(`📊 Total de textos: ${data.length}`);
      setTopicTexts(data);
    } catch (err) {
      console.error('Error cargando textos:', err);
      setTopicTexts([]);
    } finally {
      setLoadingTexts(false);
    }
  };

  const handleOpenTextsModal = async (topic) => {
    setSelectedTopicForTexts(topic);
    setShowTextsModal(true);
    setError(null);
    await loadTextsForTopic(topic.id);
  };

  const handleCloseTextsModal = () => {
    setShowTextsModal(false);
    setSelectedTopicForTexts(null);
    setTopicTexts([]);
    setError(null);
  };

  const handleOpenTextDetailModal = (text) => {
    setSelectedText(text);
    setShowTextDetailModal(true);
  };

  const handleCloseTextDetailModal = () => {
    setShowTextDetailModal(false);
    setSelectedText(null);
  };

  const handleOpenQuestionsModal = async (text) => {
    setSelectedText(text);
    setShowQuestionsModal(true);
    setLoadingQuestions(true);

    try {
      const { data } = await client.get(`/questions/text/${text.id}`);
      setTextQuestions(data);
    } catch (err) {
      console.error('Error al cargar preguntas:', err);
      setTextQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleCloseQuestionsModal = () => {
    setShowQuestionsModal(false);
    setSelectedText(null);
    setTextQuestions([]);
  };

  const handleDeleteAllQuestions = async (text) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar TODAS las preguntas de "${text.title}"?`)) {
      return;
    }

    try {
      await client.delete(`/questions/text/${text.id}`);
      setTextQuestions([]);
      alert('Todas las preguntas han sido eliminadas exitosamente');
    } catch (err) {
      console.error('Error al eliminar preguntas:', err);
      alert('Error al eliminar las preguntas');
    }
  };

  const handleRegenerateQuestions = (text) => {

    handleCloseQuestionsModal();
    handleOpenGenerateQuestionsModal(text);
  };

  const handleDeleteText = async (text) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el texto "${text.title}" y todas sus preguntas?`)) {
      return;
    }

    try {
      await client.delete(`/texts/${text.id}`);

      setTopicTexts(prev => prev.filter(t => t.id !== text.id));
      alert('Texto eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar texto:', err);
      alert('Error al eliminar el texto');
    }
  };

  const handleRegenerateText = (text) => {
    // Abrir modal de regeneración con el texto completo
    setTextToRegenerate(text);
    setRegenerateStep('preview');
    setBiasesData(null);
    setRegenerateInstructions('');
    setRegenerateModalOpen(true);
  };
  
  const handleCloseRegenerateModal = () => {
    setRegenerateModalOpen(false);
    setTextToRegenerate(null);
    setRegenerateStep('preview');
    setBiasesData(null);
    setRegenerateInstructions('');
  };
  
  const handleAnalyzeBiasesInModal = async () => {
    if (!textToRegenerate?.content) {
      alert('No hay texto para analizar');
      return;
    }

    setAnalyzingBiases(true);
    setBiasesError(null);

    try {
      const { data } = await client.post('/biases/analyze-content', {
        content: textToRegenerate.content
      });
      
      setBiasesData(data);
      setRegenerateStep('biases');
    } catch (error) {
      console.error('Error analizando sesgos:', error);
      setBiasesError(error.response?.data?.message || 'Error al analizar sesgos');
      alert('Error al analizar sesgos. Por favor intenta nuevamente.');
    } finally {
      setAnalyzingBiases(false);
    }
  };
  
  const handleRegenerateFromModal = async () => {
    if (!textToRegenerate || !biasesData) {
      alert('Primero debes analizar los sesgos');
      return;
    }

    setRegeneratingWithBiases(true);
    setTextGeneratingError(null);

    try {
      const problematicWords = new Set();
      const problematicContexts = [];
      const allBiasDescriptions = [];
      
      biasesData.biases.forEach(bias => {
        allBiasDescriptions.push(bias);
        
        const matches = bias.description.match(/"([^"]+)"/g);
        if (matches) {
          matches.forEach(match => {
            const word = match.replace(/"/g, '').trim().toLowerCase();
            if (word.length < 20 && !word.includes('...')) {
              problematicWords.add(word);
            }
          });
        }
        
        const contextMatches = bias.description.match(/"\.\.\.(.*?)\.\.\."/g);
        if (contextMatches && contextMatches.length > 0) {
          problematicContexts.push(...contextMatches.slice(0, 3));
        }
      });
      
      let improvementPrompt = `🚨🚨🚨 TAREA CRÍTICA: REESCRIBIR TEXTO ELIMINANDO TÉRMINOS ABSOLUTOS 🚨🚨🚨\n\n`;
      
      improvementPrompt += `⚠️ INSTRUCCIÓN PRINCIPAL:\n`;
      improvementPrompt += `Debes reescribir COMPLETAMENTE el texto de abajo, eliminando TODAS las ocurrencias de las palabras listadas.\n`;
      improvementPrompt += `NO copies el texto tal cual. DEBES modificar cada oración que contenga estas palabras.\n`;
      improvementPrompt += `El texto resultante NO PUEDE contener ninguna de estas palabras problemáticas.\n\n`;
      
      if (problematicWords.size > 0) {
        improvementPrompt += `🔴 LISTA DE PALABRAS PROHIBIDAS (DEBES ELIMINARLAS TODAS):\n`;
        const wordsArray = Array.from(problematicWords);
        
        const absoluteQuantifiers = wordsArray.filter(w => 
          ['cada', 'todo', 'todos', 'toda', 'todas', 'siempre', 'nunca', 'jamás', 'ningún', 'ninguna', 'ninguno', 'nadie', 'nada'].includes(w)
        );
        const otherWords = wordsArray.filter(w => !absoluteQuantifiers.includes(w));
        
        if (absoluteQuantifiers.length > 0) {
          improvementPrompt += `\n📊 CUANTIFICADORES ABSOLUTOS DETECTADOS:\n`;
          absoluteQuantifiers.forEach(word => {
            improvementPrompt += `   ❌ "${word}"\n`;
          });
          improvementPrompt += `\n✅ REGLAS DE REEMPLAZO OBLIGATORIAS:\n`;
          absoluteQuantifiers.forEach(word => {
            if (word === 'cada') {
              improvementPrompt += `   • "cada X" → REEMPLAZAR POR: "los X", "las X", "algunos X", "varios X", "muchos X"\n`;
            } else if (word === 'todo' || word === 'todos' || word === 'toda' || word === 'todas') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "la mayoría", "muchos", "varios", "gran parte"\n`;
            } else if (word === 'siempre') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "frecuentemente", "habitualmente", "en muchos casos", "típicamente"\n`;
            } else if (word === 'nunca' || word === 'jamás') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "raramente", "en pocos casos", "es infrecuente", "ocasionalmente no"\n`;
            } else if (word.includes('ningún') || word.includes('ninguna') || word === 'nadie' || word === 'nada') {
              improvementPrompt += `   • "${word}" → REEMPLAZAR POR: "pocos", "algunos no", "es poco común", "en casos limitados"\n`;
            }
          });
          improvementPrompt += `\n`;
        }
        
        if (otherWords.length > 0) {
          improvementPrompt += `\n🔍 OTRAS PALABRAS PROBLEMÁTICAS DETECTADAS:\n`;
          otherWords.forEach(word => {
            improvementPrompt += `   ❌ "${word}" → ELIMINAR o usar términos más precisos y cuantificables\n`;
          });
          improvementPrompt += `\n`;
        }
        
        if (problematicContexts.length > 0) {
          improvementPrompt += `📍 EJEMPLOS DE DÓNDE APARECEN EN EL TEXTO ORIGINAL:\n`;
          problematicContexts.forEach((ctx, i) => {
            improvementPrompt += `   ${i + 1}. ${ctx}\n`;
          });
          improvementPrompt += `   ⚠️ Estas frases DEBEN ser reescritas sin las palabras prohibidas.\n\n`;
        }
      }
      
      improvementPrompt += `\n🎯 ANÁLISIS COMPLETO DE SESGOS DETECTADOS:\n`;
      allBiasDescriptions.forEach((bias, index) => {
        improvementPrompt += `${index + 1}. ${bias.type.toUpperCase()}: ${bias.description}\n`;
        improvementPrompt += `   Corrección necesaria: ${bias.suggestion}\n\n`;
      });
      
      if (regenerateInstructions && regenerateInstructions.trim()) {
        improvementPrompt += `\n📝 INSTRUCCIONES ADICIONALES DEL PROFESOR:\n${regenerateInstructions}\n\n`;
      }
      
      improvementPrompt += `\n⚠️⚠️⚠️ PASOS OBLIGATORIOS PARA LA CORRECCIÓN ⚠️⚠️⚠️\n`;
      improvementPrompt += `1. Lee CADA LÍNEA del texto original\n`;
      improvementPrompt += `2. Busca CADA OCURRENCIA de las palabras de la lista de prohibidas\n`;
      improvementPrompt += `3. REESCRIBE la oración completa usando los reemplazos sugeridos\n`;
      improvementPrompt += `4. Verifica que el texto resultante NO contenga NINGUNA palabra prohibida\n`;
      improvementPrompt += `5. Mantén el formato 5×8 (5 párrafos de 8 líneas) y la estructura del contenido\n`;
      improvementPrompt += `6. Conserva los ejemplos, glosario y secciones especiales\n\n`;
      
      const payload = {
        tema: textToRegenerate.title || 'Marco Teorico',
        publico: textToRegenerate.metadata?.publico || 'estudiantes de ingenieria',
        nivel: textToRegenerate.difficulty || 'intermedio',
        proposito: textToRegenerate.metadata?.proposito || 'aplicar',
        ventanaInicio: textToRegenerate.metadata?.ventana?.split('-')[0] || '2020',
        ventanaFin: textToRegenerate.metadata?.ventana?.split('-')[1] || '2025',
        idioma: textToRegenerate.metadata?.idioma || 'español',
        
        textoOriginal: textToRegenerate.content,
        
        sesgosDetectados: biasesData.biases.map(bias => ({
          tipo: bias.type,
          descripcion: bias.description,
          sugerencia: bias.suggestion,
          severidad: bias.severity,
          ubicacion: bias.location,
          palabrasProblematicas: (() => {
            const normalizedProblematic = Array.isArray(bias.problematicWords)
              ? bias.problematicWords
                  .map(word => (typeof word === 'string' ? word.trim().toLowerCase() : ''))
                  .filter(word => word.length > 0)
              : [];

            if (normalizedProblematic.length > 0) {
              return Array.from(new Set(normalizedProblematic));
            }

            if (bias.location && bias.location.includes('término(s) detectado(s):')) {
              const matches = bias.location.match(/"([^"]+)"/g);
              if (matches) {
                return Array.from(new Set(matches
                  .map(m => m.replace(/"/g, '').trim().toLowerCase())
                  .filter(w => w.length > 0)));
              }
            }
            const descMatches = bias.description.match(/"([^"]+)"/g);
            if (descMatches) {
              return Array.from(new Set(descMatches
                .map(m => m.replace(/"/g, '').trim().toLowerCase())
                .filter(w => w.length < 20 && w.length > 0 && !w.includes('...'))));
            }
            return [];
          })()
        })),
        
        instruccionesDocente: regenerateInstructions && regenerateInstructions.trim() 
          ? regenerateInstructions 
          : null
      };

      console.log('📤 Payload a enviar:', {
        ...payload,
        textoOriginal: payload.textoOriginal ? `${payload.textoOriginal.substring(0, 100)}...` : 'NO',
        sesgosDetectados: payload.sesgosDetectados ? `${payload.sesgosDetectados.length} sesgos` : 'NO'
      });
      console.log('📊 Detalle de sesgos:', payload.sesgosDetectados);

      const previousBiasCount = biasesData.biases.length;

      const topicId = selectedTopicForTexts?.id || textToRegenerate.topic || textToRegenerate.topicId;
      
      if (!topicId) {
        throw new Error('No se pudo determinar el tema del texto');
      }

      const { data } = await client.post(`/texts/preview/${topicId}`, payload);

      setTextToRegenerate({ ...textToRegenerate, content: data.text.content });

      const { data: newBiasData } = await client.post('/biases/analyze-content', {
        content: data.text.content
      });
      
      const newBiasCount = newBiasData.biases.length;
      const improvement = previousBiasCount - newBiasCount;

      setBiasesData(newBiasData);
      setRegenerateStep('preview');

      alert(`✅ Texto regenerado exitosamente!\n\n📊 Sesgos: ${previousBiasCount} → ${newBiasCount} (${improvement > 0 ? '✓ -' : ''}${Math.abs(improvement)})\n📈 Calidad: ${newBiasData.quality.score}/100 (${newBiasData.quality.level})\n\n💡 Puedes volver a analizar sesgos para verificar las mejoras`);
      
      setRegenerateInstructions('');
    } catch (error) {
      console.error('Error regenerando texto:', error);
      setTextGeneratingError(error.response?.data?.message || 'Error al regenerar texto');
      alert('Error al regenerar texto. Por favor intenta nuevamente.');
    } finally {
      setRegeneratingWithBiases(false);
    }
  };
  
  const handleBackToPreviewInModal = () => {
    setRegenerateStep('preview');
  };

  const handleSaveCorrectedText = async () => {
    if (!textToRegenerate?.content) {
      alert('No hay texto para guardar');
      return;
    }

    setSavingText(true);
    setError(null);

    try {
      const topicId = selectedTopicForTexts?.id || textToRegenerate.topic || textToRegenerate.topicId;
      
      if (!topicId) {
        throw new Error('No se pudo determinar el tema del texto');
      }

      const payload = {
        title: textToRegenerate.title || 'Texto Corregido',
        content: textToRegenerate.content,
        difficulty: textToRegenerate.difficulty || 'intermedio',
        estimatedTime: textToRegenerate.estimatedTime || Math.ceil(textToRegenerate.content.length / 1000),
        metadata: textToRegenerate.metadata || {},
        tags: textToRegenerate.tags || [],
        source: 'cora-corrected'
      };

      if (textToRegenerate.id || textToRegenerate._id) {
        const textId = textToRegenerate.id || textToRegenerate._id;
        await client.patch(`/texts/${textId}`, payload);
        alert('✅ Texto corregido guardado exitosamente');
      } else {
        await client.post(`/texts/save/${topicId}`, payload);
        alert('✅ Texto corregido guardado como nuevo');
      }

      await loadTextsForTopic(topicId);
      
      handleCloseRegenerateModal();
    } catch (error) {
      console.error('Error guardando texto corregido:', error);
      setError(error.response?.data?.message || 'Error al guardar el texto');
      alert('Error al guardar el texto corregido: ' + (error.response?.data?.message || error.message));
    } finally {
      setSavingText(false);
    }
  };

  const handleRegenerateTextOld = (text) => {

    setGenerateTextForm({
      tema: text.title || '',
      publico: '',
      nivel: text.difficulty || 'intermedio',
      proposito: 'aplicar',
      ventanaInicio: '2020',
      ventanaFin: '2025',
      idioma: 'español'
    });
    setTextCorrections(`Regenerar basándote en este texto: "${text.title}". Mantén el tema pero mejora el contenido.`);
    setShowGenerateTextModal(true);
    setGenerateTextStep('config');
  };

  const handleOpenGenerateQuestionsModal = async (text) => {
    setShowGenerateQuestionsModal(true);
    setGenerateQuestionsStep('preview');
    setQuestionsGenerating(true);
    setQuestionsError(null);
    setPreviewQuestions([]);

    try {
      const payload = {
        ...(questionsCorrections && { correcciones: questionsCorrections })
      };

      const { data } = await client.post(`/questions/preview/${text.id}`, payload);

      if (data.success && data.questions) {
        setPreviewQuestions(data.questions);
      } else {
        throw new Error('No se recibieron preguntas');
      }
    } catch (err) {
      setQuestionsError(err.response?.data?.message || 'Error al generar preguntas');
    } finally {
      setQuestionsGenerating(false);
    }
  };

  const handleApproveGeneratedQuestions = async () => {
    setQuestionsGenerating(true);
    setQuestionsError(null);

    try {
      const payload = {
        questions: previewQuestions
      };

      const { data } = await client.post(`/questions/save/${selectedText.id}`, payload);

      if (data.success) {
        setShowGenerateQuestionsModal(false);
        setPreviewQuestions([]);
        setQuestionsCorrections('');
        alert('✅ Preguntas guardadas exitosamente');

        if (showQuestionsModal) {
          handleOpenQuestionsModal(selectedText);
        }
      }
    } catch (err) {
      setQuestionsError(err.response?.data?.message || 'Error al guardar preguntas');
    } finally {
      setQuestionsGenerating(false);
    }
  };

  const handleRejectGeneratedQuestions = () => {
    setGenerateQuestionsStep('corrections');
  };

  const handleRegenerateGeneratedQuestions = async () => {
    setGenerateQuestionsStep('preview');
    setPreviewQuestions([]);
    await handleOpenGenerateQuestionsModal(selectedText);
  };

  const handleCloseGenerateQuestionsModal = () => {
    setShowGenerateQuestionsModal(false);
    setPreviewQuestions([]);
    setQuestionsCorrections('');
    setGenerateQuestionsStep('preview');
    setQuestionsError(null);
  };

  const handleOpenManualTextModal = (topic) => {
    setSelectedTopicForTexts(topic);
    setEditingText(null);
    setManualTextForm({
      title: '',
      content: '',
      source: '',
      difficulty: 'intermedio',
      estimatedTime: 15
    });
    setShowManualTextModal(true);
  };

  const handleEditText = async (text) => {
    setEditingText(text);
    setManualTextForm({
      title: text.title || '',
      content: text.content || '',
      source: text.source || '',
      difficulty: text.difficulty || 'intermedio',
      estimatedTime: text.estimatedTime || 15
    });
    setShowManualTextModal(true);
  };

  const handleSaveManualText = async () => {
    if (!manualTextForm.title.trim() || !manualTextForm.content.trim()) {
      alert('Por favor completa el título y contenido del texto');
      return;
    }

    setSavingText(true);
    setError(null);

    try {
      const payload = {
        title: manualTextForm.title,
        content: manualTextForm.content,
        source: manualTextForm.source || 'Escrito manualmente',
        difficulty: manualTextForm.difficulty,
        estimatedTime: parseInt(manualTextForm.estimatedTime)
      };

      console.log('💾 Guardando texto manual:', payload);
      console.log('📍 Topic ID:', selectedTopicForTexts?.id);

      if (editingText) {

        const response = await client.patch(`/texts/${editingText.id}`, payload);
        console.log('✅ Respuesta actualización:', response.data);
        alert('✅ Texto actualizado exitosamente');
      } else {

        const response = await client.post(`/texts/save/${selectedTopicForTexts.id}`, payload);
        console.log('✅ Respuesta creación:', response.data);
        alert('✅ Texto guardado exitosamente');
      }

      setShowManualTextModal(false);
      setEditingText(null);

      console.log('🔄 Recargando textos después de guardar manual...');
      await loadTextsForTopic(selectedTopicForTexts.id);
    } catch (err) {
      console.error('❌ Error al guardar texto manual:', err);
      setError(err.response?.data?.message || 'Error al guardar el texto');
      alert('Error al guardar el texto: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingText(false);
    }
  };

  const handleCloseManualTextModal = () => {
    setShowManualTextModal(false);
    setEditingText(null);
    setManualTextForm({
      title: '',
      content: '',
      source: '',
      difficulty: 'intermedio',
      estimatedTime: 15
    });
  };

  const handleOpenManualQuestionModal = () => {
    setEditingQuestion(null);
    setManualQuestionForm({
      prompt: '',
      type: 'open-ended',
      skill: 'inferencial',
      options: []
    });
    setShowManualQuestionModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setManualQuestionForm({
      prompt: question.prompt || '',
      type: question.type || 'open-ended',
      skill: question.skill || 'inferencial',
      options: question.options || []
    });
    setShowManualQuestionModal(true);
  };

  const handleSaveManualQuestion = async () => {
    if (!manualQuestionForm.prompt.trim()) {
      alert('Por favor escribe la pregunta');
      return;
    }

    setSavingQuestion(true);
    setError(null);

    try {
      const payload = {
        prompt: manualQuestionForm.prompt,
        type: manualQuestionForm.type,
        skill: manualQuestionForm.skill,
        options: manualQuestionForm.options
      };

      if (editingQuestion) {

        await client.patch(`/questions/${editingQuestion.id}`, payload);
        alert('✅ Pregunta actualizada exitosamente');
      } else {

        await client.post('/questions', {
          ...payload,
          text: selectedText.id
        });
        alert('✅ Pregunta guardada exitosamente');
      }

      setShowManualQuestionModal(false);
      setEditingQuestion(null);

      if (selectedText) {
        handleOpenQuestionsModal(selectedText);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la pregunta');
      alert('Error al guardar la pregunta: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleCloseManualQuestionModal = () => {
    setShowManualQuestionModal(false);
    setEditingQuestion(null);
    setManualQuestionForm({
      prompt: '',
      type: 'open-ended',
      skill: 'inferencial',
      options: []
    });
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta pregunta?')) {
      return;
    }

    try {
      await client.delete(`/questions/${questionId}`);
      alert('✅ Pregunta eliminada exitosamente');

      if (selectedText) {
        const { data } = await client.get(`/questions/text/${selectedText.id}`);
        setTextQuestions(data);
      }
    } catch (err) {
      console.error('Error al eliminar pregunta:', err);
      alert('Error al eliminar la pregunta: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="course-detail fade-in">
      <button type="button" className="link-back" onClick={() => navigate('/app/courses')}>
        ← Volver
      </button>

      <header className="course-detail__header">
        <div>
          <h1>{course?.title || 'Curso'}</h1>
          <p>{course?.description || 'Gestiona temas, prerequisitos y sesiones de lectura.'}</p>
        </div>
        {canManage && (
          <button type="button" className="button-primary" onClick={() => setShowModal(true)}>
            Agregar tema
          </button>
        )}
      </header>

      {loading && <p>Cargando temas…</p>}
      {error && <p className="error-text">{error}</p>}

      <section className="topics-grid">
        {topics.map((topic) => (
          <article key={topic.id} className={`topic-card ${topic.locked ? 'locked' : ''}`}>
            <header>
              <div>
                <span className="topic-order">#{topic.order ?? 0}</span>
                <h3>{topic.title}</h3>
              </div>
              {topic.locked && <span className="badge badge-warning">Bloqueado</span>}
            </header>
            {topic.objectives?.length > 0 && (
              <div className="topic-objectives">
                {topic.objectives.map((obj) => (
                  <span key={obj}>{obj}</span>
                ))}
              </div>
            )}
            <dl className="topic-dates">
              <div>
                <dt>Lanzamiento</dt>
                <dd>{topic.releaseDate ? new Date(topic.releaseDate).toLocaleDateString() : '—'}</dd>
              </div>
              <div>
                <dt>Fecha límite</dt>
                <dd>{topic.dueDate ? new Date(topic.dueDate).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>
            <div className="topic-actions-wrapper">
              <div className="topic-buttons">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => handleOpenTextsModal(topic)}
                >
                  📚 Ver textos
                </button>
                {canManage && (
                  <button
                    type="button"
                    className="button-generate"
                    onClick={() => handleOpenGenerateModal(topic)}
                  >
                    🤖 Generar texto IA
                  </button>
                )}
              </div>
              {canManage && (
                <div className="topic-menu">
                  <button
                    type="button"
                    className="button-tertiary"
                    onClick={() => handleEditTopic(topic)}
                    title="Editar tema"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="button-tertiary danger"
                    onClick={() => handleDeleteTopic(topic.id)}
                    title="Eliminar tema"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}

        {topics.length === 0 && !loading && (
          <div className="empty-state">
            <h3>Aún no hay temas</h3>
            <p>Agrega un tema para estructurar el curso y habilitar textos, preguntas y análisis.</p>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTopic ? 'Editar tema' : 'Nuevo tema'}</h2>
              <button type="button" className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form className="topic-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="title">Título *</label>
                  <input id="title" name="title" value={topicForm.title} onChange={handleTopicChange} required />
                </div>
                <div className="field">
                  <label htmlFor="order">Orden</label>
                  <input id="order" name="order" type="number" min="1" value={topicForm.order} onChange={handleTopicChange} />
                </div>
                <div className="field">
                  <label htmlFor="releaseDate">Fecha de lanzamiento</label>
                  <input id="releaseDate" name="releaseDate" type="date" value={topicForm.releaseDate} onChange={handleTopicChange} />
                </div>
                <div className="field">
                  <label htmlFor="dueDate">Fecha límite</label>
                  <input id="dueDate" name="dueDate" type="date" value={topicForm.dueDate} onChange={handleTopicChange} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="description">Descripción</label>
                <textarea id="description" name="description" rows={3} value={topicForm.description} onChange={handleTopicChange} />
              </div>

              <div className="objectives">
                <span>Habilidades prioritarias</span>
                <div className="objective-grid">
                  {objectiveOptions.map((option) => (
                    <label key={option} className={`objective-chip ${topicForm.objectives.includes(option) ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={topicForm.objectives.includes(option)}
                        onChange={() => handleObjectiveToggle(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="modal-footer">
                <button type="button" className="button-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="button-primary">
                  {editingTopic ? 'Actualizar tema' : 'Guardar tema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenerateModal && selectedTopicForGenerate && (
        <div className="modal-overlay" onClick={handleCloseGenerateModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤖 Generar texto con IA</h2>
              <button type="button" className="modal-close" onClick={handleCloseGenerateModal}>
                ✕
              </button>
            </div>

            {generateModalStep === 1 && (
              <>
                <div className="generate-text-content">
                  <div className="topic-info-card">
                    <h3>{selectedTopicForGenerate.title}</h3>
                    <p className="topic-order-badge">Tema #{selectedTopicForGenerate.order}</p>
                  </div>

                  <div className="info-box">
                    <p><strong>📝 ¿Qué sucederá?</strong></p>
                    <ul>
                      <li>Se generará un texto académico usando Inteligencia Artificial</li>
                      <li>El texto estará adaptado a las habilidades prioritarias del tema</li>
                      <li>Podrás revisar y editar el texto antes de aprobarlo</li>
                      <li>El proceso puede tomar unos segundos</li>
                    </ul>
                  </div>

                  {selectedTopicForGenerate.objectives?.length > 0 && (
                    <div className="objectives-preview">
                      <p><strong>🎯 Habilidades a desarrollar:</strong></p>
                      <div className="objective-grid">
                        {selectedTopicForGenerate.objectives.map((obj) => (
                          <span key={obj} className="objective-chip active">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="button-secondary" onClick={handleCloseGenerateModal}>
                    Cancelar
                  </button>
                  <button type="button" className="button-primary" onClick={handleContinueToForm}>
                    🚀 Continuar con generación
                  </button>
                </div>
              </>
            )}

            {generateModalStep === 2 && (
              <>
                <div className="generate-text-content">
                  <div className="topic-info-small">
                    <p className="topic-subtitle">Tema: {selectedTopicForGenerate.title}</p>
                  </div>

                  <div className="config-section">
                    <div className="section-header">
                      <span className="section-number">1️⃣</span>
                      <h3>Configuración del texto</h3>
                    </div>

                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="theme">Tema del texto *</label>
                        <input
                          id="theme"
                          name="theme"
                          type="text"
                          value={generateForm.theme}
                          onChange={handleGenerateFormChange}
                          placeholder="Ej: Gestión de recursos y presupuesto"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="targetAudience">Público objetivo *</label>
                        <input
                          id="targetAudience"
                          name="targetAudience"
                          type="text"
                          value={generateForm.targetAudience}
                          onChange={handleGenerateFormChange}
                          placeholder="Ej: estudiantes de ingeniería"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="difficulty">Nivel de dificultad</label>
                        <select
                          id="difficulty"
                          name="difficulty"
                          value={generateForm.difficulty}
                          onChange={handleGenerateFormChange}
                        >
                          <option value="basico">Básico</option>
                          <option value="intermedio">Intermedio</option>
                          <option value="avanzado">Avanzado</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="educationalPurpose">Propósito educativo</label>
                        <select
                          id="educationalPurpose"
                          name="educationalPurpose"
                          value={generateForm.educationalPurpose}
                          onChange={handleGenerateFormChange}
                        >
                          <option value="recordar">Recordar</option>
                          <option value="comprender">Comprender</option>
                          <option value="aplicar">Aplicar</option>
                          <option value="analizar">Analizar</option>
                          <option value="evaluar">Evaluar</option>
                          <option value="crear">Crear</option>
                        </select>
                      </div>

                      <div className="field">
                        <label htmlFor="startYear">Ventana temporal (año inicio)</label>
                        <input
                          id="startYear"
                          name="startYear"
                          type="text"
                          value={generateForm.startYear}
                          onChange={handleGenerateFormChange}
                          placeholder="2020"
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="endYear">Ventana temporal (año fin)</label>
                        <input
                          id="endYear"
                          name="endYear"
                          type="text"
                          value={generateForm.endYear}
                          onChange={handleGenerateFormChange}
                          placeholder="2025"
                        />
                      </div>

                      <div className="field field-full">
                        <label htmlFor="language">Idioma</label>
                        <select
                          id="language"
                          name="language"
                          value={generateForm.language}
                          onChange={handleGenerateFormChange}
                        >
                          <option value="español">Español</option>
                          <option value="ingles">Inglés</option>
                          <option value="frances">Francés</option>
                          <option value="aleman">Alemán</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {generateModalError && <p className="error-text">{generateModalError}</p>}

                <div className="modal-footer">
                  <button type="button" className="button-secondary" onClick={handleBackToInfo}>
                    ← Volver
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleGenerateText}
                    disabled={textGenerating}
                  >
                    {textGenerating ? '⏳ Generando...' : '🎨 Generar Preview'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showTextsModal && selectedTopicForTexts && (
        <div className="modal-overlay" onClick={handleCloseTextsModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h2>Textos de: {selectedTopicForTexts.title}</h2>
                <p className="modal-subtitle">{selectedTopicForTexts.description}</p>
              </div>
              <button type="button" className="modal-close" onClick={handleCloseTextsModal}>
                ✕
              </button>
            </div>

            <div className="texts-modal-content" style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
              {loadingTexts && <p className="loading-message">Cargando textos...</p>}

              {!loadingTexts && topicTexts.length === 0 && (
                <div className="empty-state-modal">
                  <h3>📚 No hay textos aún</h3>
                  <p>Este tema aún no tiene textos asignados.</p>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() => handleOpenGenerateTextModal(selectedTopicForTexts)}
                      >
                        🤖 Generar con IA
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => handleOpenManualTextModal(selectedTopicForTexts)}
                      >
                        ✏️ Escribir Manualmente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!loadingTexts && topicTexts.length > 0 && (
                <div className="texts-list">
                  {topicTexts.map((text) => (
                    <article key={text.id} className="text-card-modal">
                      <div className="text-card-header">
                        <h3>{text.title}</h3>
                        <span className={`badge badge-${text.status === 'approved' ? 'success' : 'warning'}`}>
                          {text.status === 'approved' ? 'APROBADO' : text.difficulty?.toUpperCase() || 'AVANZADO'}
                        </span>
                      </div>

                      {text.generatedBy && (
                        <p className="text-meta">
                          🤖 Generado por IA ({text.generatedBy})
                        </p>
                      )}

                      <p className="text-meta">
                        ⏱️ {text.readingTimeMinutes || 6} min de lectura
                      </p>

                      {text.tags && text.tags.length > 0 && (
                        <div className="text-tags">
                          {text.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-tag">{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="text-card-actions">
                        <button
                          type="button"
                          className="button-primary-small"
                          onClick={() => handleOpenTextDetailModal(text)}
                        >
                          📖 Ver texto completo
                        </button>
                        <button
                          type="button"
                          className="button-secondary-small"
                          onClick={() => handleOpenQuestionsModal(text)}
                        >
                          ✅ Ver preguntas
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="button-warning-small"
                              onClick={() => handleEditText(text)}
                              title="Editar texto manualmente"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="button-tertiary-small"
                              onClick={() => handleRegenerateText(text)}
                              title="Regenerar con IA"
                            >
                              🔄 Regenerar IA
                            </button>
                            <button
                              type="button"
                              className="button-danger-small"
                              onClick={() => handleDeleteText(text)}
                              title="Eliminar texto y sus preguntas"
                            >
                              🗑️ Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {canManage && topicTexts.length > 0 && (
                <>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => handleOpenGenerateTextModal(selectedTopicForTexts)}
                  >
                    🤖 Generar con IA
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => handleOpenManualTextModal(selectedTopicForTexts)}
                  >
                    ✏️ Escribir Manualmente
                  </button>
                </>
              )}
              <button type="button" className="button-tertiary" onClick={handleCloseTextsModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showTextDetailModal && selectedText && (
        <div className="modal-overlay" onClick={handleCloseTextDetailModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedText.title}</h2>
              <button type="button" className="modal-close" onClick={handleCloseTextDetailModal}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="text-detail-content">
                {selectedText.generatedBy && (
                  <p className="text-meta" style={{ marginBottom: '1rem' }}>
                    🤖 Generado por IA ({selectedText.generatedBy})
                  </p>
                )}

                <p className="text-meta" style={{ marginBottom: '1rem' }}>
                  ⏱️ {selectedText.readingTimeMinutes || 6} min de lectura
                </p>

                {selectedText.tags && selectedText.tags.length > 0 && (
                  <div className="text-tags" style={{ marginBottom: '1.5rem' }}>
                    {selectedText.tags.map((tag, idx) => (
                      <span key={idx} className="text-tag">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="text-content" style={{
                  lineHeight: '1.8',
                  fontSize: '1rem',
                  color: '#333',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedText.content}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  handleCloseTextDetailModal();
                  handleOpenQuestionsModal(selectedText);
                }}
              >
                🤖 Generar Preguntas con IA
              </button>
              <button type="button" className="button-secondary" onClick={handleCloseTextDetailModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuestionsModal && selectedText && (
        <div className="modal-overlay" onClick={handleCloseQuestionsModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2>📝 Preguntas del texto</h2>
              <button type="button" className="modal-close" onClick={handleCloseQuestionsModal}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
              {loadingQuestions && (
                <p className="loading-message">Cargando preguntas...</p>
              )}

              {!loadingQuestions && textQuestions.length === 0 && (
                <div className="empty-state-modal">
                  <p>⚠️ Este texto no tiene preguntas guardadas aún.</p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => {
                        handleCloseQuestionsModal();
                        handleOpenGenerateQuestionsModal(selectedText);
                      }}
                    >
                      🤖 Generar con IA
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={handleOpenManualQuestionModal}
                    >
                      ✏️ Escribir Manualmente
                    </button>
                  </div>
                </div>
              )}

              {!loadingQuestions && textQuestions.length > 0 && (
                <div className="questions-list">
                  <div className="info-box" style={{
                    background: '#e8f5e9',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid #a5d6a7'
                  }}>
                    <p style={{ margin: 0, color: '#2e7d32', fontWeight: '500' }}>
                      ✅ Este texto tiene {textQuestions.length} preguntas guardadas.
                    </p>
                  </div>

                  {textQuestions.map((question, idx) => (
                    <div key={question.id || idx} className="question-card" style={{
                      background: '#f9f9f9',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <strong style={{ color: '#333' }}>Pregunta {idx + 1}</strong>
                        <span className={`badge badge-${
                          question.skill === 'evidence' || question.skill === 'literal' ? 'info' :
                          question.skill === 'inference' || question.skill === 'inferencial' ? 'success' :
                          question.skill === 'bias-detection' || question.skill === 'counterargument' || question.skill === 'crítica' ? 'warning' :
                          question.skill === 'synthesis' || question.skill === 'reflection' || question.skill === 'aplicación' ? 'danger' :
                          'primary'
                        }`} style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {question.skill === 'evidence' ? '� Literal' :
                           question.skill === 'inference' || question.skill === 'inferencial' ? '🔍 Inferencial' :
                           question.skill === 'bias-detection' || question.skill === 'counterargument' || question.skill === 'crítica' ? '🎯 Crítica' :
                           question.skill === 'synthesis' || question.skill === 'reflection' || question.skill === 'aplicación' ? '💡 Aplicación' :
                           '🧠 ' + question.skill}
                        </span>
                      </div>

                      <p style={{
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        color: '#444',
                        marginBottom: '1rem'
                      }}>
                        {question.prompt || question.question}
                      </p>

                      {canManage && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="button-warning-small"
                            onClick={() => handleEditQuestion(question)}
                            title="Editar pregunta manualmente"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="button-danger-small"
                            onClick={() => handleDeleteQuestion(question.id || question._id)}
                            title="Eliminar pregunta"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {canManage && textQuestions.length > 0 && (
                <>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => {
                      handleCloseQuestionsModal();
                      handleOpenGenerateQuestionsModal(selectedText);
                    }}
                  >
                    🤖 Generar con IA
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={handleOpenManualQuestionModal}
                  >
                    ✏️ Escribir Manualmente
                  </button>
                  <button
                    type="button"
                    className="button-warning"
                    onClick={() => handleRegenerateQuestions(selectedText)}
                  >
                    🔄 Regenerar IA
                  </button>
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => handleDeleteAllQuestions(selectedText)}
                  >
                    🗑️ Eliminar todas
                  </button>
                </>
              )}
              <button type="button" className="button-tertiary" onClick={handleCloseQuestionsModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateQuestionsModal && selectedText && (
        <div className="modal-overlay" onClick={handleCloseGenerateQuestionsModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤖 Generar Preguntas con IA</h2>
              <button type="button" className="modal-close" onClick={handleCloseGenerateQuestionsModal}>
                ✕
              </button>
            </div>

            {generateQuestionsStep === 'preview' && (
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {questionsGenerating ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Generando preguntas con IA, por favor espera...</p>
                  </div>
                ) : questionsError ? (
                  <div className="error-message">{questionsError}</div>
                ) : previewQuestions.length > 0 ? (
                  <>
                    <div className="info-box" style={{
                      background: '#e3f2fd',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      border: '1px solid #90caf9'
                    }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}>✅ Se han generado {previewQuestions.length} preguntas para reforzar el aprendizaje.</p>
                      <p style={{ margin: 0 }}>Revisa las preguntas y decide si aprobarlas o solicitar correcciones.</p>
                    </div>

                    <div className="questions-list">
                      {previewQuestions.map((q, idx) => {
                        const questionType = q.type || 'literal';
                        return (
                          <div key={idx} className="question-card" style={{
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1rem'
                          }}>
                            <div className="question-header" style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '0.75rem'
                            }}>
                              <span className="question-number" style={{
                                fontWeight: 'bold',
                                color: '#666'
                              }}>Pregunta {idx + 1}</span>
                              <span className={`badge badge-${questionType}`}>
                                {questionType === 'literal' && '📖 Literal'}
                                {questionType === 'inferencial' && '🔍 Inferencial'}
                                {questionType === 'inferencia' && '🔍 Inferencial'}
                                {questionType === 'crítica' && '💭 Crítica'}
                                {questionType === 'critica' && '💭 Crítica'}
                                {questionType === 'aplicación' && '🚀 Aplicación'}
                                {questionType === 'aplicacion' && '🚀 Aplicación'}
                              </span>
                            </div>
                            <p className="question-text" style={{
                              margin: '0 0 0.5rem 0',
                              lineHeight: '1.6'
                            }}>{q.question}</p>
                            {q.explanation && (
                              <p className="question-explanation" style={{
                                margin: 0,
                                fontSize: '0.9rem',
                                color: '#666',
                                fontStyle: 'italic'
                              }}>
                                <strong>Evalúa:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {generateQuestionsStep === 'corrections' && (
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div className="info-box" style={{
                  background: '#fff3cd',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid #ffc107'
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>📝 Indica cómo mejorar las preguntas:</p>
                  <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: 0 }}>
                    <li>¿Qué preguntas eliminar?</li>
                    <li>¿Qué preguntas agregar?</li>
                    <li>¿Qué tipos de pregunta necesitas más?</li>
                    <li>¿Alguna pregunta es confusa o ambigua?</li>
                  </ul>
                </div>

                <div className="form-group">
                  <label htmlFor="corrections">Correcciones a las preguntas</label>
                  <textarea
                    id="corrections"
                    value={questionsCorrections}
                    onChange={(e) => setQuestionsCorrections(e.target.value)}
                    placeholder="Ej: Elimina la pregunta 3. Agrega una pregunta de aplicación sobre casos reales. La pregunta 5 es muy confusa, replantéala."
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="modal-footer">
              {generateQuestionsStep === 'preview' && previewQuestions.length > 0 && (
                <>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={handleRejectGeneratedQuestions}
                    disabled={questionsGenerating}
                  >
                    ❌ Solicitar correcciones
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleApproveGeneratedQuestions}
                    disabled={questionsGenerating}
                  >
                    ✅ Aprobar y guardar
                  </button>
                </>
              )}

              {generateQuestionsStep === 'corrections' && (
                <>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setGenerateQuestionsStep('preview')}
                  >
                    ← Volver
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleRegenerateGeneratedQuestions}
                    disabled={!questionsCorrections.trim() || questionsGenerating}
                  >
                    {questionsGenerating ? '⏳ Regenerando...' : '🔄 Regenerar preguntas'}
                  </button>
                </>
              )}

              {(questionsError || (!questionsGenerating && previewQuestions.length === 0 && generateQuestionsStep === 'preview')) && (
                <button type="button" className="button-secondary" onClick={handleCloseGenerateQuestionsModal}>
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showManualTextModal && (
        <div className="modal-overlay" onClick={handleCloseManualTextModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingText ? '✏️ Editar Texto' : '✏️ Escribir Texto Manualmente'}</h2>
              <button type="button" className="modal-close" onClick={handleCloseManualTextModal}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label>Título del texto *</label>
                <input
                  type="text"
                  value={manualTextForm.title}
                  onChange={(e) => setManualTextForm({ ...manualTextForm, title: e.target.value })}
                  placeholder="Ej: Introducción a las Falacias Lógicas"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div className="form-group">
                <label>Contenido del texto *</label>
                <textarea
                  value={manualTextForm.content}
                  onChange={(e) => setManualTextForm({ ...manualTextForm, content: e.target.value })}
                  placeholder="Escribe el contenido completo del texto aquí..."
                  rows={15}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>Fuente</label>
                  <input
                    type="text"
                    value={manualTextForm.source}
                    onChange={(e) => setManualTextForm({ ...manualTextForm, source: e.target.value })}
                    placeholder="Ej: Artículo académico, Libro, etc."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Dificultad</label>
                  <select
                    value={manualTextForm.difficulty}
                    onChange={(e) => setManualTextForm({ ...manualTextForm, difficulty: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="basico">Básico</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tiempo estimado (minutos)</label>
                  <input
                    type="number"
                    value={manualTextForm.estimatedTime}
                    onChange={(e) => setManualTextForm({ ...manualTextForm, estimatedTime: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="120"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="button-secondary" onClick={handleCloseManualTextModal} disabled={savingText}>
                Cancelar
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={handleSaveManualText}
                disabled={savingText || !manualTextForm.title.trim() || !manualTextForm.content.trim()}
              >
                {savingText ? '⏳ Guardando...' : (editingText ? '💾 Actualizar Texto' : '💾 Guardar Texto')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualQuestionModal && (
        <div className="modal-overlay" onClick={handleCloseManualQuestionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingQuestion ? '✏️ Editar Pregunta' : '✏️ Escribir Pregunta Manualmente'}</h2>
              <button type="button" className="modal-close" onClick={handleCloseManualQuestionModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Pregunta *</label>
                <textarea
                  value={manualQuestionForm.prompt}
                  onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, prompt: e.target.value })}
                  placeholder="Escribe la pregunta aquí..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>Habilidad</label>
                  <select
                    value={manualQuestionForm.skill}
                    onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, skill: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="literal">Literal</option>
                    <option value="inferencial">Inferencial</option>
                    <option value="crítica">Crítica</option>
                    <option value="aplicación">Aplicación</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={manualQuestionForm.type}
                    onChange={(e) => setManualQuestionForm({ ...manualQuestionForm, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="open-ended">Abierta</option>
                    <option value="multiple-choice">Opción múltiple</option>
                  </select>
                </div>
              </div>

              {manualQuestionForm.type === 'multiple-choice' && (
                <div className="info-box" style={{
                  background: '#fff3e0',
                  border: '1px solid #ffb74d',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#e65100' }}>
                    ℹ️ Las opciones de preguntas de opción múltiple se configurarán después. Por ahora solo escribe la pregunta.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="button-secondary" onClick={handleCloseManualQuestionModal} disabled={savingQuestion}>
                Cancelar
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={handleSaveManualQuestion}
                disabled={savingQuestion || !manualQuestionForm.prompt.trim()}
              >
                {savingQuestion ? '⏳ Guardando...' : (editingQuestion ? '💾 Actualizar Pregunta' : '💾 Guardar Pregunta')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateTextModal && (
        <div className="modal-overlay" onClick={handleCloseGenerateTextModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤖 Generar Texto con IA</h2>
              <button type="button" className="modal-close" onClick={handleCloseGenerateTextModal}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

              {generateTextStep === 'config' && (
                <>
                  <div className="form-group">
                    <label>Tema del texto *</label>
                    <input
                      type="text"
                      value={generateTextForm.tema}
                      onChange={(e) => setGenerateTextForm({ ...generateTextForm, tema: e.target.value })}
                      placeholder="Ej: Falacias lógicas en el debate político"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Público objetivo *</label>
                    <input
                      type="text"
                      value={generateTextForm.publico}
                      onChange={(e) => setGenerateTextForm({ ...generateTextForm, publico: e.target.value })}
                      placeholder="Ej: Estudiantes universitarios de ciencias sociales"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Nivel</label>
                      <select
                        value={generateTextForm.nivel}
                        onChange={(e) => setGenerateTextForm({ ...generateTextForm, nivel: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
                      >
                        <option value="basico">Básico</option>
                        <option value="intermedio">Intermedio</option>
                        <option value="avanzado">Avanzado</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Propósito educativo</label>
                      <select
                        value={generateTextForm.proposito}
                        onChange={(e) => setGenerateTextForm({ ...generateTextForm, proposito: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
                      >
                        <option value="aplicar">Aplicar</option>
                        <option value="analizar">Analizar</option>
                        <option value="evaluar">Evaluar</option>
                        <option value="crear">Crear</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Año inicio</label>
                      <input
                        type="number"
                        value={generateTextForm.ventanaInicio}
                        onChange={(e) => setGenerateTextForm({ ...generateTextForm, ventanaInicio: e.target.value })}
                        min="1900"
                        max="2100"
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Año fin</label>
                      <input
                        type="number"
                        value={generateTextForm.ventanaFin}
                        onChange={(e) => setGenerateTextForm({ ...generateTextForm, ventanaFin: e.target.value })}
                        min="1900"
                        max="2100"
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Idioma</label>
                      <select
                        value={generateTextForm.idioma}
                        onChange={(e) => setGenerateTextForm({ ...generateTextForm, idioma: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
                      >
                        <option value="español">Español</option>
                        <option value="english">English</option>
                      </select>
                    </div>
                  </div>

                  {textGeneratingError && (
                    <div className="error-message" style={{ background: '#ffebee', border: '1px solid #f44336', borderRadius: '8px', padding: '1rem', color: '#c62828' }}>
                      ❌ {textGeneratingError}
                    </div>
                  )}
                </>
              )}

              {generateTextStep === 'preview' && previewText && (
                <>
                  <h3 style={{ marginBottom: '1rem' }}>📄 Vista previa del texto generado</h3>

                  <div style={{ background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem' }}>
                    <h4 style={{ marginTop: 0, color: '#1976d2' }}>{previewText.title}</h4>
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      fontSize: '0.95rem'
                    }}>
                      {previewText.content}
                    </div>
                  </div>

                  <div className="info-box" style={{ background: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', padding: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      ℹ️ <strong>Nivel:</strong> {previewText.difficulty} | <strong>Tiempo estimado:</strong> {previewText.estimatedTime} min
                    </p>
                  </div>
                </>
              )}

              {generateTextStep === 'biases' && biasesData && (
                <>
                  <h3 style={{ marginBottom: '1rem' }}>🔍 Análisis de Sesgos</h3>

                  {/* Calidad del texto */}
                  {biasesData.quality && (
                    <div style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: biasesData.quality.score >= 75 ? '#e8f5e9' : biasesData.quality.score >= 60 ? '#fff3e0' : '#ffebee',
                      border: `2px solid ${biasesData.quality.score >= 75 ? '#4caf50' : biasesData.quality.score >= 60 ? '#ff9800' : '#f44336'}`,
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Calidad del Texto</h4>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{biasesData.quality.score}/100</span>
                      </div>
                      <p style={{ margin: 0, fontWeight: '600', textTransform: 'capitalize' }}>{biasesData.quality.level}</p>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{biasesData.quality.message}</p>
                    </div>
                  )}

                  {/* Lista de sesgos */}
                  {biasesData.biases && biasesData.biases.length > 0 ? (
                    <>
                      <h4 style={{ marginBottom: '1rem' }}>Sesgos Detectados ({biasesData.biases.length})</h4>
                      <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                        {biasesData.biases.map((bias, index) => (
                          <div key={bias._id || index} style={{
                            padding: '1rem',
                            marginBottom: '0.75rem',
                            borderRadius: '8px',
                            background: bias.severity === 'alta' ? '#ffebee' : bias.severity === 'media' ? '#fff3e0' : '#e3f2fd',
                            border: `2px solid ${bias.severity === 'alta' ? '#f44336' : bias.severity === 'media' ? '#ff9800' : '#2196f3'}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                              <h5 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1rem' }}>
                                {bias.type}
                              </h5>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', background: 'white', borderRadius: '12px' }}>
                                  {Math.round(bias.confidence * 100)}%
                                </span>
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem',
                                  background: 'white',
                                  borderRadius: '12px',
                                  textTransform: 'uppercase',
                                  fontWeight: 'bold'
                                }}>
                                  {bias.severity}
                                </span>
                              </div>
                            </div>
                            <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                              <strong>Problema:</strong> {bias.description}
                            </p>
                            {bias.location && (
                              <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', opacity: 0.8 }}>
                                <strong>Ubicación:</strong> {bias.location}
                              </p>
                            )}
                            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.7)', borderRadius: '6px', marginTop: '0.5rem' }}>
                              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                <strong>💡 Sugerencia:</strong> {bias.suggestion}
                              </p>
                            </div>
                            {bias.factCheckUrl && (
                              <a href={bias.factCheckUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', marginTop: '0.5rem', display: 'inline-block' }}>
                                Ver verificación externa →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', background: '#e8f5e9', borderRadius: '12px', marginBottom: '1.5rem' }}>
                      <span style={{ fontSize: '3rem' }}>✅</span>
                      <p style={{ margin: '0.5rem 0 0', fontWeight: '600' }}>¡Excelente! No se detectaron sesgos significativos</p>
                    </div>
                  )}

                  {/* Campo para instrucciones adicionales */}
                  {biasesData.biases && biasesData.biases.length > 0 && (
                    <>
                      <h4 style={{ marginBottom: '0.75rem' }}>✍️ Instrucciones adicionales (opcional)</h4>
                      <div className="form-group">
                        <textarea
                          value={textCorrections}
                          onChange={(e) => setTextCorrections(e.target.value)}
                          placeholder="Ej: Hazlo más breve, agrega más ejemplos, simplifica el lenguaje..."
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <div className="info-box" style={{ background: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', padding: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#1565c0' }}>
                          💡 El sistema regenerará el texto eliminando los sesgos detectados. Puedes agregar instrucciones adicionales para personalizar la regeneración.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

              {generateTextStep === 'corrections' && (
                <>
                  <h3 style={{ marginBottom: '1rem' }}>✍️ Solicitar correcciones</h3>

                  <div className="form-group">
                    <label>Instrucciones para regenerar el texto</label>
                    <textarea
                      value={textCorrections}
                      onChange={(e) => setTextCorrections(e.target.value)}
                      placeholder="Ej: Hazlo más breve, enfócate más en ejemplos prácticos, simplifica el lenguaje..."
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div className="info-box" style={{ background: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px', padding: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#e65100' }}>
                      💡 Sé específico con tus correcciones para obtener mejores resultados.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              {generateTextStep === 'config' && (
                <>
                  <button type="button" className="button-secondary" onClick={handleCloseGenerateTextModal} disabled={textGenerating}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleGenerateTextPreview}
                    disabled={textGenerating || !generateTextForm.tema.trim() || !generateTextForm.publico.trim()}
                  >
                    {textGenerating ? '⏳ Generando...' : '🎯 Generar Preview'}
                  </button>
                </>
              )}

              {generateTextStep === 'preview' && (
                <>
                  <button type="button" className="button-secondary" onClick={handleAnalyzeBiases} disabled={analyzingBiases}>
                    {analyzingBiases ? '⏳ Analizando...' : '🔍 Analizar Sesgos'}
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleApproveText}
                    disabled={textGenerating}
                  >
                    {textGenerating ? '⏳ Guardando...' : '✅ Aprobar y Guardar'}
                  </button>
                </>
              )}

              {generateTextStep === 'biases' && (
                <>
                  <button type="button" className="button-secondary" onClick={handleBackToPreview} disabled={regeneratingWithBiases}>
                    ← Volver al Preview
                  </button>
                  {biasesData?.biases && biasesData.biases.length > 0 ? (
                    <button
                      type="button"
                      className="button-primary"
                      onClick={handleRegenerateWithBiases}
                      disabled={regeneratingWithBiases}
                    >
                      {regeneratingWithBiases ? '⏳ Regenerando...' : '🔄 Regenerar con Mejoras'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button-primary"
                      onClick={handleApproveText}
                      disabled={textGenerating}
                    >
                      {textGenerating ? '⏳ Guardando...' : '✅ Aprobar y Guardar'}
                    </button>
                  )}
                </>
              )}

              {generateTextStep === 'corrections' && (
                <>
                  <button type="button" className="button-secondary" onClick={handleBackToPreview} disabled={textGenerating}>
                    ← Volver al Preview
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleGenerateTextPreview}
                    disabled={textGenerating}
                  >
                    {textGenerating ? '⏳ Regenerando...' : '🔄 Regenerar con Correcciones'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Regeneración de Texto */}
      {regenerateModalOpen && textToRegenerate && (
        <div className="modal-overlay" onClick={handleCloseRegenerateModal}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '900px', 
            maxHeight: '85vh', 
            overflow: 'auto',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div className="modal-header" style={{
              background: '#ffffff',
              borderBottom: '2px solid #e0e0e0',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>🔄 Regenerar Texto con IA</h2>
              <button className="close-button" onClick={handleCloseRegenerateModal} style={{
                background: 'transparent',
                border: 'none',
                fontSize: '2rem',
                cursor: 'pointer',
                color: '#666',
                lineHeight: '1'
              }}>×</button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', background: '#ffffff' }}>
              {regenerateStep === 'preview' && (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                      margin: '0 0 1rem 0', 
                      color: '#1976d2', 
                      fontSize: '1.3rem',
                      fontWeight: '600'
                    }}>📄 Texto Actual</h3>
                    
                    <div style={{ 
                      background: '#f8f9fa', 
                      border: '1px solid #dee2e6', 
                      borderRadius: '8px', 
                      padding: '1.5rem',
                      marginBottom: '1rem'
                    }}>
                      <h4 style={{ 
                        marginTop: 0, 
                        marginBottom: '1rem',
                        color: '#2c3e50', 
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        borderBottom: '2px solid #e0e0e0',
                        paddingBottom: '0.5rem'
                      }}>
                        {textToRegenerate.title}
                      </h4>
                      <div style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.8',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontSize: '0.95rem',
                        color: '#4a5568',
                        padding: '0.5rem'
                      }}>
                        {textToRegenerate.content}
                      </div>
                    </div>

                    <div style={{ 
                      background: '#e3f2fd', 
                      border: '1px solid #90caf9', 
                      borderRadius: '8px', 
                      padding: '1rem'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#1565c0' }}>
                        ℹ️ <strong>Nivel:</strong> {textToRegenerate.difficulty} | 
                        <strong> Tiempo estimado:</strong> {textToRegenerate.estimatedTime} min
                      </p>
                    </div>
                  </div>
                </>
              )}

              {regenerateStep === 'biases' && biasesData && (
                <>
                  <h3 style={{ 
                    margin: '0 0 1.5rem 0', 
                    color: '#1976d2',
                    fontSize: '1.3rem',
                    fontWeight: '600'
                  }}>🔍 Análisis de Sesgos</h3>

                  <div style={{
                    background: biasesData.quality.score >= 80 ? '#d4edda' : biasesData.quality.score >= 60 ? '#fff3cd' : '#f8d7da',
                    border: `2px solid ${biasesData.quality.score >= 80 ? '#28a745' : biasesData.quality.score >= 60 ? '#ffc107' : '#dc3545'}`,
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Calidad del Texto</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                      {biasesData.quality.score}/100
                    </div>
                    <p style={{ margin: 0, fontSize: '1.1rem', textTransform: 'capitalize' }}>
                      <strong>{biasesData.quality.level}</strong>
                    </p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      {biasesData.quality.message}
                    </p>
                  </div>

                  <h4 style={{ marginBottom: '1rem' }}>
                    Sesgos Detectados ({biasesData.biases.length})
                  </h4>

                  {biasesData.biases.length === 0 ? (
                    <div style={{ background: '#d4edda', border: '1px solid #28a745', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '1.1rem' }}>
                        ✅ ¡Excelente! No se detectaron sesgos en el texto
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                      {biasesData.biases.map((bias, index) => (
                        <div
                          key={index}
                          style={{
                            background: bias.severity === 'alta' ? '#f8d7da' : bias.severity === 'media' ? '#fff3cd' : '#d1ecf1',
                            border: `2px solid ${bias.severity === 'alta' ? '#dc3545' : bias.severity === 'media' ? '#ffc107' : '#17a2b8'}`,
                            borderRadius: '8px',
                            padding: '1rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h5 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.1rem' }}>
                              {bias.type}
                            </h5>
                            <span style={{
                              background: bias.severity === 'alta' ? '#dc3545' : bias.severity === 'media' ? '#ffc107' : '#17a2b8',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              textTransform: 'uppercase'
                            }}>
                              {bias.severity}
                            </span>
                          </div>
                          <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', color: '#555' }}>
                            <strong>Problema:</strong> {bias.description}
                          </p>
                          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                            <strong>Ubicación:</strong> {bias.location}
                          </p>
                          <div style={{ background: 'rgba(255,255,255,0.5)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                              💡 <strong>Sugerencia:</strong> {bias.suggestion}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '1.5rem' }}>
                    <label htmlFor="regenerateInstructions" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      📝 Instrucciones adicionales para el agente (opcional):
                    </label>
                    <textarea
                      id="regenerateInstructions"
                      value={regenerateInstructions}
                      onChange={(e) => setRegenerateInstructions(e.target.value)}
                      placeholder="Ej: Agrega más ejemplos prácticos, Amplía la sección de glosario, etc."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '0.95rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer" style={{ 
              borderTop: '2px solid #e0e0e0', 
              padding: '1rem 1.5rem', 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'flex-end',
              background: '#fafafa'
            }}>
              {regenerateStep === 'preview' && (
                <>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={handleCloseRegenerateModal}
                    disabled={analyzingBiases || savingText}
                  >
                    Cerrar
                  </button>
                  {/* Mostrar botón de guardar si ya se analizaron sesgos (texto fue regenerado) */}
                  {biasesData && (
                    <button
                      type="button"
                      className="button-success"
                      onClick={handleSaveCorrectedText}
                      disabled={savingText || analyzingBiases}
                      style={{
                        background: '#28a745',
                        color: 'white'
                      }}
                    >
                      {savingText ? '⏳ Guardando...' : '💾 Guardar Texto Corregido'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleAnalyzeBiasesInModal}
                    disabled={analyzingBiases || savingText}
                  >
                    {analyzingBiases ? '⏳ Analizando...' : biasesData ? '🔄 Re-analizar Sesgos' : '🔍 Analizar Sesgos'}
                  </button>
                </>
              )}

              {regenerateStep === 'biases' && (
                <>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={handleBackToPreviewInModal}
                    disabled={regeneratingWithBiases}
                  >
                    ← Volver al Texto
                  </button>
                  {biasesData?.biases && biasesData.biases.length > 0 && (
                    <button
                      type="button"
                      className="button-primary"
                      onClick={handleRegenerateFromModal}
                      disabled={regeneratingWithBiases}
                    >
                      {regeneratingWithBiases ? '⏳ Regenerando...' : '🔄 Regenerar con Mejoras'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailPage;
