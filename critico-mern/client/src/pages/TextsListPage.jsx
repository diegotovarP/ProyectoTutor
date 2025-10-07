import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import client from '../api/client';
import './TextsListPage.css';

const TextsListPage = () => {
  const { courseId, topicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [texts, setTexts] = useState([]);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);
  const [questionsStep, setQuestionsStep] = useState('preview');
  const [questionsCorrections, setQuestionsCorrections] = useState('');
  const [viewMode, setViewMode] = useState('generate');
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [currentTextForQuestions, setCurrentTextForQuestions] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: topics } = await client.get(`/topics/course/${courseId}`);
        const foundTopic = topics.find((t) => t.id === topicId);
        setTopic(foundTopic);

        const { data: textsData } = await client.get(`/texts/topic/${topicId}`);
        setTexts(textsData);

        if (location.state?.newTextGenerated && location.state?.textId) {
          const newText = textsData.find(t => t.id === location.state.textId);
          if (newText) {
            setSelectedText(newText);
            setShowSuccessMessage(true);

            navigate(location.pathname, { replace: true, state: {} });

            setTimeout(() => setShowSuccessMessage(false), 4000);
          }
        }

      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar los textos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, topicId, location.state, location.pathname, navigate]);

  const handleViewText = (text) => {
    setSelectedText(text);
  };

  const handleCloseText = () => {
    setSelectedText(null);
  };

  const handleViewSavedQuestions = async (text) => {
    setCurrentTextForQuestions(text);
    setViewMode('view');
    setShowQuestionsModal(true);
    setQuestionsLoading(true);
    setQuestionsError(null);

    try {
      const { data } = await client.get(`/questions/text/${text.id}`);
      setSavedQuestions(data);
    } catch (err) {
      setQuestionsError(err.response?.data?.message || 'Error al cargar las preguntas');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleGenerateQuestions = async (text) => {
    setCurrentTextForQuestions(text);
    setViewMode('generate');
    setShowQuestionsModal(true);
    setQuestionsLoading(true);
    setQuestionsError(null);
    setQuestionsStep('preview');

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
      setQuestionsLoading(false);
    }
  };

  const handleApproveQuestions = async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);

    try {
      const payload = {
        questions: previewQuestions
      };

      const { data } = await client.post(`/questions/save/${currentTextForQuestions.id}`, payload);

      if (data.success) {
        setShowQuestionsModal(false);
        setPreviewQuestions([]);
        setQuestionsCorrections('');
        alert('✅ Preguntas guardadas exitosamente');
      }
    } catch (err) {
      setQuestionsError(err.response?.data?.message || 'Error al guardar preguntas');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleRejectQuestions = () => {
    setQuestionsStep('corrections');
  };

  const handleRegenerateQuestions = async () => {
    setQuestionsStep('preview');
    setPreviewQuestions([]);
    await handleGenerateQuestions(currentTextForQuestions);
  };

  const handleCloseQuestionsModal = () => {
    setShowQuestionsModal(false);
    setPreviewQuestions([]);
    setQuestionsCorrections('');
    setQuestionsStep('preview');
    setSavedQuestions([]);
    setViewMode('generate');
    setCurrentTextForQuestions(null);
  };

  const handleGoBack = () => {
    navigate(`/app/courses/${courseId}`);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'básico':
        return '#4caf50';
      case 'intermedio':
        return '#ff9800';
      case 'avanzado':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <div className="texts-list-page">
        <div className="loading">Cargando textos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="texts-list-page">
        <div className="error-message">{error}</div>
        <button onClick={handleGoBack} className="btn-back">Volver al curso</button>
      </div>
    );
  }

  return (
    <div className="texts-list-page">
      <div className="texts-header">
        <button onClick={handleGoBack} className="btn-back">
          ← Volver al curso
        </button>
        <h1>Textos de: {topic?.title}</h1>
        <p className="topic-description">{topic?.description}</p>
      </div>

      {texts.length === 0 ? (
        <div className="no-texts">
          <p>📚 No hay textos generados para este tema todavía.</p>
          <button
            onClick={() => navigate(`/app/courses/${courseId}/topics/${topicId}/generate-text`)}
            className="btn-generate"
          >
            🤖 Generar texto con IA
          </button>
        </div>
      ) : (
        <div className="texts-grid">
          {texts.map((text) => (
            <div key={text.id} className="text-card">
              <div className="text-card-header">
                <h3>{text.title}</h3>
                <span
                  className="difficulty-badge"
                  style={{ backgroundColor: getDifficultyColor(text.difficulty) }}
                >
                  {text.difficulty}
                </span>
              </div>

              <div className="text-card-body">
                <p className="text-source">📄 {text.source}</p>
                <p className="text-time">⏱️ {text.estimatedTime} min de lectura</p>

                {text.tags && text.tags.length > 0 && (
                  <div className="text-tags">
                    {text.tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                )}

                {text.completed && (
                  <div className="completed-badge">✅ Completado</div>
                )}
              </div>

              <div className="text-card-footer">
                <button
                  onClick={() => handleViewText(text)}
                  className="btn-view"
                >
                  👁️ Ver texto completo
                </button>
                <button
                  onClick={() => handleViewSavedQuestions(text)}
                  className="btn-view-questions"
                >
                  📝 Ver preguntas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedText && (
        <div className="text-modal-overlay" onClick={handleCloseText}>
          <div className="text-modal" onClick={(e) => e.stopPropagation()}>
            {showSuccessMessage && (
              <div className="success-banner">
                🎉 ¡Texto generado exitosamente con IA!
              </div>
            )}
            <div className="text-modal-header">
              <h2>{selectedText.title}</h2>
              <button onClick={handleCloseText} className="btn-close">
                ✕
              </button>
            </div>
            <div className="text-modal-body">
              <div className="text-content">
                {selectedText.content ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedText.content.replace(/\n/g, '<br/>')
                    }}
                  />
                ) : (
                  <p>No hay contenido disponible</p>
                )}
              </div>
            </div>
            <div className="text-modal-footer">
              <button onClick={handleCloseText} className="btn-close-modal">
                Cerrar
              </button>
              <button
                onClick={() => handleGenerateQuestions(selectedText)}
                className="btn-generate-questions"
              >
                🤖 Generar Preguntas con IA
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuestionsModal && (
        <div className="questions-modal-overlay" onClick={handleCloseQuestionsModal}>
          <div className="questions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="questions-modal-header">
              <h2>
                {viewMode === 'view' ? '📝 Preguntas del texto' : '🤖 Preguntas generadas con IA'}
              </h2>
              <button onClick={handleCloseQuestionsModal} className="btn-close">
                ✕
              </button>
            </div>

            {viewMode === 'view' && (
              <div className="questions-modal-body">
                {questionsLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando preguntas...</p>
                  </div>
                ) : questionsError ? (
                  <div className="error-message">{questionsError}</div>
                ) : savedQuestions.length === 0 ? (
                  <div className="no-questions">
                    <p>📝 No hay preguntas generadas para este texto todavía.</p>
                    <button
                      onClick={() => {
                        handleGenerateQuestions(currentTextForQuestions);
                      }}
                      className="btn-primary"
                    >
                      🤖 Generar preguntas ahora
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="info-box">
                      <p>✅ Este texto tiene {savedQuestions.length} preguntas guardadas.</p>
                    </div>

                    <div className="questions-list">
                      {savedQuestions.map((q, idx) => {

                        const skillToType = {

                          'literal': 'literal',
                          'inferencial': 'inferencial',
                          'crítica': 'crítica',
                          'aplicación': 'aplicación',

                          'evidence': 'literal',
                          'inference': 'inferencial',
                          'bias-detection': 'crítica',
                          'synthesis': 'aplicación',
                          'counterargument': 'crítica',
                          'reflection': 'aplicación'
                        };
                        const displayType = skillToType[q.skill] || 'literal';

                        return (
                          <div key={q.id || idx} className="question-card">
                            <div className="question-header">
                              <span className="question-number">Pregunta {idx + 1}</span>
                              <span className={`question-type type-${displayType}`}>
                                {displayType === 'literal' && '📖 Literal'}
                                {displayType === 'inferencial' && '🔍 Inferencial'}
                                {displayType === 'crítica' && '🎯 Crítica'}
                                {displayType === 'aplicación' && '� Aplicación'}
                              </span>
                            </div>
                            <p className="question-text">{q.prompt}</p>
                            {q.feedbackTemplate && (
                              <p className="question-explanation">
                                <strong>Evalúa:</strong> {q.feedbackTemplate}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="questions-modal-footer">
                      <button onClick={handleCloseQuestionsModal} className="btn-secondary">
                        Cerrar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {viewMode === 'generate' && questionsStep === 'preview' && (
              <div className="questions-modal-body">
                {questionsLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Generando preguntas con IA, por favor espera...</p>
                  </div>
                ) : questionsError ? (
                  <div className="error-message">{questionsError}</div>
                ) : previewQuestions.length > 0 ? (
                  <>
                    <div className="info-box">
                      <p>✅ Se han generado {previewQuestions.length} preguntas para reforzar el aprendizaje.</p>
                      <p>Revisa las preguntas y decide si aprobarlas o solicitar correcciones.</p>
                    </div>

                    <div className="questions-list">
                      {previewQuestions.map((q, idx) => (
                        <div key={idx} className="question-card">
                          <div className="question-header">
                            <span className="question-number">Pregunta {idx + 1}</span>
                            <span className={`question-type type-${q.type}`}>
                              {q.type === 'literal' && '📖 Literal'}
                              {q.type === 'inferencia' && '🔍 Inferencia'}
                              {q.type === 'crítica' && '💭 Crítica'}
                              {q.type === 'critica' && '💭 Crítica'}
                              {q.type === 'aplicación' && '🚀 Aplicación'}
                              {q.type === 'aplicacion' && '🚀 Aplicación'}
                            </span>
                          </div>
                          <p className="question-text">{q.question}</p>
                          {q.explanation && (
                            <p className="question-explanation">
                              <strong>Evalúa:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="questions-modal-footer">
                      <button onClick={handleRejectQuestions} className="btn-secondary" disabled={questionsLoading}>
                        ❌ Solicitar correcciones
                      </button>
                      <button onClick={handleApproveQuestions} className="btn-primary" disabled={questionsLoading}>
                        ✅ Aprobar y guardar
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {viewMode === 'generate' && questionsStep === 'corrections' && (
              <div className="questions-modal-body">
                <div className="info-box">
                  <p>📝 Indica cómo mejorar las preguntas:</p>
                  <ul>
                    <li>¿Qué preguntas eliminar?</li>
                    <li>¿Qué preguntas agregar?</li>
                    <li>¿Qué tipos de pregunta necesitas más?</li>
                    <li>¿Alguna pregunta es confusa o ambigua?</li>
                  </ul>
                </div>

                <div className="form-group">
                  <label>Correcciones a las preguntas</label>
                  <textarea
                    value={questionsCorrections}
                    onChange={(e) => setQuestionsCorrections(e.target.value)}
                    placeholder="Ej: Elimina la pregunta 3. Agrega una pregunta de aplicación sobre casos reales. La pregunta 5 es muy confusa, replantéala."
                    rows={8}
                    className="corrections-textarea"
                  />
                </div>

                <div className="questions-modal-footer">
                  <button onClick={() => setQuestionsStep('preview')} className="btn-secondary">
                    ← Volver
                  </button>
                  <button
                    onClick={handleRegenerateQuestions}
                    disabled={!questionsCorrections.trim() || questionsLoading}
                    className="btn-primary"
                  >
                    {questionsLoading ? '⏳ Regenerando...' : '🔄 Regenerar preguntas'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextsListPage;
