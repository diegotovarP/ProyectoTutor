import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import './CourseContentPage.css';

const CourseContentPage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showTextEditorModal, setShowTextEditorModal] = useState(false);

  const [topicForm, setTopicForm] = useState({ title: '', description: '', order: 1 });
  const [textForm, setTextForm] = useState({
    title: '',
    content: '',
    source: '',
    difficulty: 'intermedio',
    estimatedTime: 15,
    useAI: false
  });
  const [questionForm, setQuestionForm] = useState({
    prompt: '',
    type: 'open-ended',
    skill: 'inferencial',
    options: [],
    useAI: false
  });

  const [editingTopic, setEditingTopic] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [textQuestions, setTextQuestions] = useState([]);

  const [generatingText, setGeneratingText] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  useEffect(() => {
    if (selectedTopic) {
      fetchTopicTexts(selectedTopic._id);
    }
  }, [selectedTopic]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const { data: courseData } = await client.get(`/courses/${courseId}`);
      setCourse(courseData);

      const { data: topicsData } = await client.get(`/topics/course/${courseId}`);
      setTopics(topicsData || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el curso');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicTexts = async (topicId) => {
    try {
      const { data } = await client.get(`/texts/topic/${topicId}`);
      setTexts(data || []);
    } catch (err) {
      console.error('Error al cargar textos:', err);
    }
  };

  const fetchTextQuestions = async (textId) => {
    try {
      const { data } = await client.get(`/questions/text/${textId}`);
      setTextQuestions(data || []);
    } catch (err) {
      console.error('Error al cargar preguntas:', err);
    }
  };

  const handleCreateTopic = () => {
    setEditingTopic(null);
    setTopicForm({ title: '', description: '', order: topics.length + 1 });
    setShowTopicModal(true);
  };

  const handleEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicForm({
      title: topic.title,
      description: topic.description || '',
      order: topic.order || 1
    });
    setShowTopicModal(true);
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    try {
      if (editingTopic) {
        await client.patch(`/topics/${editingTopic._id}`, topicForm);
      } else {
        await client.post('/topics', {
          ...topicForm,
          course: courseId
        });
      }
      setShowTopicModal(false);
      fetchCourseData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar tema');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!confirm('¿Eliminar este tema y todos sus textos?')) return;
    try {
      await client.delete(`/topics/${topicId}`);
      fetchCourseData();
      if (selectedTopic?._id === topicId) {
        setSelectedTopic(null);
        setTexts([]);
      }
    } catch (err) {
      alert('Error al eliminar tema');
    }
  };

  const handleCreateText = () => {
    setEditingText(null);
    setTextForm({
      title: '',
      content: '',
      source: '',
      difficulty: 'intermedio',
      estimatedTime: 15,
      useAI: false
    });
    setAiPrompt('');
    setShowTextModal(true);
  };

  const handleEditText = (text) => {
    setEditingText(text);
    setTextForm({
      title: text.title,
      content: text.content,
      source: text.source || '',
      difficulty: text.difficulty || 'intermedio',
      estimatedTime: text.estimatedTime || 15,
      useAI: false
    });
    setShowTextModal(true);
  };

  const handleGenerateTextWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Por favor describe qué texto quieres generar');
      return;
    }

    try {
      setGeneratingText(true);

      const response = await client.post('/ai/generate-text', {
        prompt: aiPrompt,
        difficulty: textForm.difficulty,
        topic: selectedTopic?.title
      });

      setTextForm(prev => ({
        ...prev,
        title: response.data.title,
        content: response.data.content,
        source: 'Generado por IA'
      }));

      alert('✅ Texto generado. Puedes editarlo antes de guardar.');
    } catch (err) {

      setTextForm(prev => ({
        ...prev,
        title: `Texto sobre ${aiPrompt}`,
        content: `Este es un texto generado por IA sobre: ${aiPrompt}\n\n[El contenido generado aparecería aquí. Por ahora puedes escribir manualmente o esperar la integración con IA]`,
        source: 'Generado por IA'
      }));
      alert('⚠️ Endpoint de IA no disponible aún. Mostrando texto de ejemplo.');
    } finally {
      setGeneratingText(false);
    }
  };

  const handleSaveText = async (e) => {
    e.preventDefault();
    if (!selectedTopic) {
      alert('Selecciona un tema primero');
      return;
    }

    try {
      const payload = {
        ...textForm,
        topic: selectedTopic._id
      };

      if (editingText) {
        await client.patch(`/texts/${editingText._id}`, payload);
      } else {
        await client.post('/texts', payload);
      }

      setShowTextModal(false);
      fetchTopicTexts(selectedTopic._id);
      alert('✅ Texto guardado exitosamente');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar texto');
    }
  };

  const handleDeleteText = async (textId) => {
    if (!confirm('¿Eliminar este texto y todas sus preguntas?')) return;
    try {
      await client.delete(`/texts/${textId}`);
      fetchTopicTexts(selectedTopic._id);
    } catch (err) {
      alert('Error al eliminar texto');
    }
  };

  const handleViewTextQuestions = async (text) => {
    setSelectedText(text);
    await fetchTextQuestions(text._id);
    setShowTextEditorModal(true);
  };

  const handleCreateQuestion = () => {
    setQuestionForm({
      prompt: '',
      type: 'open-ended',
      skill: 'inferencial',
      options: [],
      useAI: false
    });
    setShowQuestionModal(true);
  };

  const handleGenerateQuestionsWithAI = async () => {
    if (!selectedText) {
      alert('Selecciona un texto primero');
      return;
    }

    try {
      setGeneratingQuestions(true);

      const response = await client.post('/ai/generate-questions', {
        textId: selectedText._id,
        count: 5,
        skills: ['inferencial', 'evidencia', 'crítica']
      });

      setTextQuestions(response.data.questions);
      alert('✅ Preguntas generadas exitosamente');
    } catch (err) {

      const mockQuestions = [
        { prompt: '¿Qué puedes inferir del argumento principal?', skill: 'inferencial', type: 'open-ended' },
        { prompt: '¿Qué evidencia respalda la conclusión del autor?', skill: 'evidencia', type: 'open-ended' },
        { prompt: '¿Qué supuestos subyacentes identifica el texto?', skill: 'crítica', type: 'open-ended' }
      ];
      alert('⚠️ Endpoint de IA no disponible. Mostrando preguntas de ejemplo.');
      console.log('Preguntas de ejemplo:', mockQuestions);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!selectedText) {
      alert('Selecciona un texto primero');
      return;
    }

    try {
      await client.post('/questions', {
        ...questionForm,
        text: selectedText._id
      });

      setShowQuestionModal(false);
      fetchTextQuestions(selectedText._id);
      alert('✅ Pregunta guardada exitosamente');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar pregunta');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    try {
      await client.delete(`/questions/${questionId}`);
      fetchTextQuestions(selectedText._id);
    } catch (err) {
      alert('Error al eliminar pregunta');
    }
  };

  if (loading) return <div className="loading">Cargando curso...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="course-content-page">

      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/app/courses')}>← Volver</button>
        <div>
          <h1>📚 {course?.title}</h1>
          <p>Gestiona el contenido de tu curso</p>
        </div>
      </div>

      <div className="content-layout">

        <div className="topics-panel">
          <div className="panel-header">
            <h2>Temas del curso</h2>
            <button className="btn-primary" onClick={handleCreateTopic}>+ Nuevo Tema</button>
          </div>

          {topics.length === 0 ? (
            <p className="empty-message">No hay temas aún. Crea el primero.</p>
          ) : (
            <div className="topics-list">
              {topics.map(topic => (
                <div
                  key={topic._id}
                  className={`topic-item ${selectedTopic?._id === topic._id ? 'active' : ''}`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  <div className="topic-info">
                    <span className="topic-order">{topic.order}</span>
                    <div>
                      <h3>{topic.title}</h3>
                      <p>{topic.description}</p>
                    </div>
                  </div>
                  <div className="topic-actions">
                    <button onClick={(e) => { e.stopPropagation(); handleEditTopic(topic); }}>✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic._id); }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="texts-panel">
          {!selectedTopic ? (
            <div className="empty-state">
              <p>👈 Selecciona un tema para ver sus textos</p>
            </div>
          ) : (
            <>
              <div className="panel-header">
                <h2>Textos de: {selectedTopic.title}</h2>
                <button className="btn-primary" onClick={handleCreateText}>+ Nuevo Texto</button>
              </div>

              {texts.length === 0 ? (
                <p className="empty-message">No hay textos en este tema. Crea el primero.</p>
              ) : (
                <div className="texts-grid">
                  {texts.map(text => (
                    <div key={text._id} className="text-card">
                      <h3>{text.title}</h3>
                      <div className="text-meta">
                        <span>📊 {text.difficulty}</span>
                        <span>⏱️ {text.estimatedTime} min</span>
                        {text.source && <span>📄 {text.source}</span>}
                      </div>
                      <p className="text-preview">{text.content?.substring(0, 150)}...</p>
                      <div className="text-actions">
                        <button onClick={() => handleViewTextQuestions(text)}>❓ Ver Preguntas</button>
                        <button onClick={() => handleEditText(text)}>✏️ Editar</button>
                        <button onClick={() => handleDeleteText(text._id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showTopicModal && (
        <div className="modal-overlay" onClick={() => setShowTopicModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTopic ? '✏️ Editar Tema' : '➕ Nuevo Tema'}</h2>
              <button onClick={() => setShowTopicModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveTopic}>
              <div className="form-group">
                <label>Título del tema *</label>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Orden</label>
                <input
                  type="number"
                  value={topicForm.order}
                  onChange={(e) => setTopicForm({ ...topicForm, order: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowTopicModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">💾 Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTextModal && (
        <div className="modal-overlay" onClick={() => setShowTextModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingText ? '✏️ Editar Texto' : '➕ Nuevo Texto'}</h2>
              <button onClick={() => setShowTextModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveText}>

              <div className="generation-mode">
                <label className="mode-toggle">
                  <input
                    type="checkbox"
                    checked={textForm.useAI}
                    onChange={(e) => setTextForm({ ...textForm, useAI: e.target.checked })}
                  />
                  <span>🤖 Generar con IA</span>
                </label>
              </div>

              {textForm.useAI && (
                <div className="ai-section">
                  <div className="form-group">
                    <label>Describe el texto que quieres generar</label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ej: Un texto sobre falacias lógicas para nivel intermedio que incluya ejemplos de ad hominem y falsa dicotomía"
                      rows={3}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-ai"
                    onClick={handleGenerateTextWithAI}
                    disabled={generatingText}
                  >
                    {generatingText ? '⏳ Generando...' : '✨ Generar Texto con IA'}
                  </button>
                  <hr />
                </div>
              )}

              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={textForm.title}
                  onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contenido del texto *</label>
                <textarea
                  value={textForm.content}
                  onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                  rows={12}
                  placeholder="Escribe el contenido del texto aquí..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fuente</label>
                  <input
                    type="text"
                    value={textForm.source}
                    onChange={(e) => setTextForm({ ...textForm, source: e.target.value })}
                    placeholder="Ej: Artículo académico, Libro, etc."
                  />
                </div>
                <div className="form-group">
                  <label>Dificultad</label>
                  <select
                    value={textForm.difficulty}
                    onChange={(e) => setTextForm({ ...textForm, difficulty: e.target.value })}
                  >
                    <option value="basico">Básico</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tiempo estimado (min)</label>
                  <input
                    type="number"
                    value={textForm.estimatedTime}
                    onChange={(e) => setTextForm({ ...textForm, estimatedTime: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowTextModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">💾 Guardar Texto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTextEditorModal && selectedText && (
        <div className="modal-overlay" onClick={() => setShowTextEditorModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>❓ Preguntas de: {selectedText.title}</h2>
              <button onClick={() => setShowTextEditorModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="questions-actions">
                <button className="btn-primary" onClick={handleCreateQuestion}>
                  ✏️ Escribir Pregunta Manualmente
                </button>
                <button
                  className="btn-ai"
                  onClick={handleGenerateQuestionsWithAI}
                  disabled={generatingQuestions}
                >
                  {generatingQuestions ? '⏳ Generando...' : '🤖 Generar con IA'}
                </button>
              </div>

              {textQuestions.length === 0 ? (
                <p className="empty-message">No hay preguntas para este texto. Crea la primera.</p>
              ) : (
                <div className="questions-list">
                  {textQuestions.map((q, index) => (
                    <div key={q._id} className="question-item">
                      <div className="question-header">
                        <span className="question-number">Pregunta {index + 1}</span>
                        <span className={`skill-badge ${q.skill}`}>{q.skill}</span>
                        <span className="type-badge">{q.type === 'open-ended' ? 'Abierta' : 'Opción múltiple'}</span>
                      </div>
                      <p className="question-prompt">{q.prompt}</p>
                      {q.options && q.options.length > 0 && (
                        <ul className="question-options">
                          {q.options.map((opt, i) => (
                            <li key={i} className={opt.isCorrect ? 'correct' : ''}>
                              {opt.label} {opt.isCorrect && '✅'}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="question-actions">
                        <button onClick={() => handleDeleteQuestion(q._id)}>🗑️ Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showQuestionModal && (
        <div className="modal-overlay" onClick={() => setShowQuestionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Nueva Pregunta</h2>
              <button onClick={() => setShowQuestionModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div className="form-group">
                <label>Pregunta *</label>
                <textarea
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                  placeholder="Escribe la pregunta aquí..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Habilidad</label>
                  <select
                    value={questionForm.skill}
                    onChange={(e) => setQuestionForm({ ...questionForm, skill: e.target.value })}
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
                    value={questionForm.type}
                    onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                  >
                    <option value="open-ended">Abierta</option>
                    <option value="multiple-choice">Opción múltiple</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowQuestionModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">💾 Guardar Pregunta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseContentPage;
