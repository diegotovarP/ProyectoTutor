import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import StudentChatbot from '../components/StudentChatbot';
import './StudentEvaluationPage.css';

const StudentEvaluationPage = () => {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showTextsModal, setShowTextsModal] = useState(false);
  const [showTextDetailModal, setShowTextDetailModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseTexts, setCourseTexts] = useState([]);
  const [selectedText, setSelectedText] = useState(null);
  const [textQuestions, setTextQuestions] = useState([]);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  const [questionAttempts, setQuestionAttempts] = useState({}); 
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  
  // ✅ NUEVO: Estados para análisis de sesgos
  const [showBiasModal, setShowBiasModal] = useState(false);
  const [biasAnalysis, setBiasAnalysis] = useState(null);
  const [analyzingBias, setAnalyzingBias] = useState(false);
  const [biasError, setBiasError] = useState(null);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [user]);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const { data } = await client.get(`/enrollments/student/${user._id}/progress`);
      setEnrolledCourses(data.progress || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (course) => {
    if (!window.confirm(`¿Estás seguro de que quieres des-matricularte del curso "${course.courseTitle}"? Perderás todo tu progreso.`)) {
      return;
    }

    try {
      await client.delete(`/enrollments/student/${user._id}/course/${course.courseId}`);
      alert('Te has des-matriculado exitosamente del curso');
      fetchEnrolledCourses();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al des-matricularse del curso');
    }
  };

  const handleViewTexts = async (course) => {
    setSelectedCourse(course);
    setShowTextsModal(true);
    setLoadingTexts(true);
    
    try {
      const { data: topics } = await client.get(`/topics/course/${course.courseId}`);
      
      const allTexts = [];
      for (const topic of topics) {
        const { data: texts } = await client.get(`/texts/topic/${topic.id}`);
        allTexts.push(...texts);
      }
      
      const textsWithStatus = await Promise.all(
        allTexts.map(async (text) => {
          try {
            const { data } = await client.get(`/attempts/text/${text.id}/student/${user._id}`);
            return {
              ...text,
              hasAnswers: data.hasAttempts && data.attempts.length > 0
            };
          } catch {
            return { ...text, hasAnswers: false };
          }
        })
      );
      
      setCourseTexts(textsWithStatus);
    } catch (err) {
      alert('Error al cargar los textos');
    } finally {
      setLoadingTexts(false);
    }
  };

  const handleAnswerQuestions = async (course) => {
    setSelectedCourse(course);
    setShowTextsModal(true);
    setLoadingTexts(true);
    
    try {
      const { data: topics } = await client.get(`/topics/course/${course.courseId}`);
      const allTexts = [];
      for (const topic of topics) {
        const { data: texts } = await client.get(`/texts/topic/${topic.id}`);
        allTexts.push(...texts);
      }
      
      const textsWithStatus = await Promise.all(
        allTexts.map(async (text) => {
          try {
            const { data } = await client.get(`/attempts/text/${text.id}/student/${user._id}`);
            return {
              ...text,
              hasAnswers: data.hasAttempts && data.attempts.length > 0
            };
          } catch {
            return { ...text, hasAnswers: false };
          }
        })
      );
      
      setCourseTexts(textsWithStatus);
    } catch (err) {
      alert('Error al cargar los textos');
    } finally {
      setLoadingTexts(false);
    }
  };

  const handleSelectTextToView = (text) => {
    setSelectedText(text);
    setShowTextsModal(false);
    setShowTextDetailModal(true);
  };

  const handleOpenQuestionsFromText = async () => {
    setShowTextDetailModal(false);
    setShowQuestionsModal(true);
    setLoadingQuestions(true);
    setAnswers({});
    setQuestionAttempts({});
    
    try {
      const { data } = await client.get(`/questions/text/${selectedText.id}`);
      setTextQuestions(data || []);
      
      const { data: attemptsData } = await client.get(`/attempts/text/${selectedText.id}/student/${user._id}`);
      if (attemptsData.hasAttempts && attemptsData.attempts.length > 0) {
        const previousAnswers = {};
        const attempts = {};
        
        attemptsData.attempts.forEach(attempt => {
          if (attempt.question) {
            const questionId = attempt.question._id || attempt.question;
            if (attempt.answers && attempt.answers.length > 0) {
              previousAnswers[questionId] = attempt.answers[0].value;
            }
            attempts[questionId] = {
              id: attempt._id,
              autoFeedback: attempt.autoFeedback,
              feedback: attempt.feedback, 
              feedbackGeneratedAt: attempt.feedbackGeneratedAt,
              score: attempt.score,
              isModified: false 
            };
          }
        });
        
        setAnswers(previousAnswers);
        setQuestionAttempts(attempts);
        
        console.log('✅ Respuestas previas cargadas:', previousAnswers);
        console.log('✅ Attempts cargados:', attempts);
      }
    } catch (err) {
      alert('Error al cargar las preguntas');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleGenerateFeedback = async (questionId) => {
    const attempt = questionAttempts[questionId];
    
    if (!attempt || !attempt.id) {
      alert('Primero debes enviar tu respuesta antes de generar feedback');
      return;
    }

    setGeneratingFeedback(true);
    setFeedbackError(null);

    try {
      const { data } = await client.post(`/questions/attempt/${attempt.id}/feedback`);
      
      setQuestionAttempts(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          autoFeedback: data.feedback,
          feedbackGeneratedAt: new Date()
        }
      }));

      setSelectedFeedback({
        questionId,
        feedback: data.feedback,
        type: 'ai'
      });
      setShowFeedbackModal(true);

    } catch (err) {
      console.error('Error generando feedback:', err);
      setFeedbackError(err.response?.data?.message || 'Error al generar feedback con IA');
      alert('Error al generar feedback: ' + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingFeedback(false);
    }
  };

  const handleViewFeedback = (questionId, type) => {
    const attempt = questionAttempts[questionId];
    
    if (!attempt) {
      alert('No hay feedback disponible aún');
      return;
    }

    const feedback = type === 'ai' ? attempt.autoFeedback : attempt.feedback;
    
    if (!feedback) {
      alert(type === 'ai' ? 'No hay feedback de IA generado aún' : 'El docente aún no ha dejado feedback');
      return;
    }

    setSelectedFeedback({
      questionId,
      feedback,
      type
    });
    setShowFeedbackModal(true);
  };

  // ✅ NUEVO: Función para analizar sesgos de la respuesta del estudiante
  const handleAnalyzeBias = async (questionId, regenerate = false) => {
    const attempt = questionAttempts[questionId];
    
    if (!attempt || !attempt.id) {
      alert('No se encontró la respuesta para analizar');
      return;
    }

    setAnalyzingBias(true);
    setBiasError(null);

    try {
      // Agregar query param ?regenerate=true si se solicita regenerar
      const url = `/biases/analyze-student-answer/${attempt.id}${regenerate ? '?regenerate=true' : ''}`;
      const { data } = await client.post(url);
      
      setBiasAnalysis({
        questionId,
        ...data
      });
      setShowBiasModal(true);

    } catch (err) {
      console.error('Error analizando sesgos:', err);
      setBiasError(err.response?.data?.message || 'Error al analizar sesgos');
      alert('Error al analizar sesgos: ' + (err.response?.data?.message || err.message));
    } finally {
      setAnalyzingBias(false);
    }
  };

  // ✅ Guardar análisis de sesgos
  const handleSaveBiasAnalysis = async () => {
    if (!biasAnalysis) return;

    const attempt = questionAttempts[biasAnalysis.questionId];
    if (!attempt || !attempt.id) return;

    try {
      const { data } = await client.post(`/biases/save-student-analysis/${attempt.id}`, biasAnalysis);

      setBiasAnalysis({
        ...biasAnalysis,
        saved: true,
        analyzedAt: data.analyzedAt
      });

      alert('✅ Análisis de sesgos guardado correctamente');
    } catch (err) {
      console.error('Error guardando análisis:', err);
      alert('Error al guardar: ' + (err.response?.data?.message || err.message));
    }
  };

  // ✅ Regenerar análisis de sesgos
  const handleRegenerateBiasAnalysis = async () => {
    if (!biasAnalysis) return;
    const questionId = biasAnalysis.questionId;
    await handleAnalyzeBias(questionId, true); // Forzar regeneración
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    if (questionAttempts[questionId]) {
      setQuestionAttempts(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          isModified: true
        }
      }));
    }
  };

  const handleSubmitSingleAnswer = async (questionId) => {
    const answer = answers[questionId];
    
    if (!answer || answer.trim() === '') {
      alert('Por favor escribe una respuesta antes de enviar');
      return;
    }

    if (!window.confirm('¿Enviar esta respuesta?')) {
      return;
    }

    try {
      setSubmitting(true);
      
      await client.post('/attempts/submit', {
        studentId: user._id,
        textId: selectedText.id,
        answers: [{
          questionId: questionId,
          answer: answer
        }]
      });

      const { data: attemptsData } = await client.get(`/attempts/text/${selectedText.id}/student/${user._id}`);
      
      if (attemptsData.hasAttempts && attemptsData.attempts.length > 0) {
        const attempts = {};
        attemptsData.attempts.forEach(attempt => {
          if (attempt.question) {
            const qId = attempt.question._id || attempt.question;
            attempts[qId] = {
              id: attempt._id,
              autoFeedback: attempt.autoFeedback,
              feedback: attempt.feedback,
              feedbackGeneratedAt: attempt.feedbackGeneratedAt,
              score: attempt.score,
              isModified: false 
            };
          }
        });
        setQuestionAttempts(attempts);
      }

      alert('✅ ¡Respuesta enviada exitosamente!');
    } catch (err) {
      alert('Error al enviar la respuesta: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnswers = async () => {
    const unanswered = textQuestions.filter(q => !answers[q.id] || answers[q.id].trim() === '');
    if (unanswered.length > 0) {
      alert(`Por favor responde todas las preguntas. Faltan ${unanswered.length} respuesta(s).`);
      return;
    }

    if (!window.confirm('¿Estás seguro de enviar todas tus respuestas?')) {
      return;
    }

    try {
      setSubmitting(true);
      
      const answersArray = textQuestions.map(q => ({
        questionId: q.id,
        answer: answers[q.id],
        timeSpentSeconds: 0 
      }));

      await client.post('/attempts', {
        studentId: user._id,
        textId: selectedText.id,
        answers: answersArray
      });

      alert('✅ ¡Respuestas enviadas exitosamente!');
      setShowQuestionsModal(false);
      setAnswers({});
      setTextQuestions([]);
      setSelectedText(null);
    } catch (err) {
      alert('Error al enviar las respuestas: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return '#4caf50';
    if (percentage >= 50) return '#ff9800';
    if (percentage >= 25) return '#ffc107';
    return '#f44336';
  };

  if (loading) {
    return (
      <div className="student-evaluation-page">
        <div className="loading">Cargando tus cursos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-evaluation-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="student-evaluation-page">
      <div className="page-header">
        <h1>📊 Evaluación</h1>
        <p>Responde las preguntas de tus cursos y visualiza tu progreso</p>
      </div>

      {enrolledCourses.length === 0 ? (
        <div className="empty-state">
          <p>📚 No estás matriculado en ningún curso</p>
          <p className="empty-subtitle">Dirígete a "Cursos Disponibles" para matricularte</p>
        </div>
      ) : (
        <div className="courses-grid">
          {enrolledCourses.map((course) => (
            <div key={course.courseId} className="evaluation-card">
              <div className="card-header">
                <h3>{course.courseTitle}</h3>
                <button 
                  className="btn-unenroll"
                  onClick={() => handleUnenroll(course)}
                  title="Des-matricularse"
                >
                  ✕
                </button>
              </div>

              <div className="card-body">
                <p className="course-description">{course.courseDescription}</p>
                
                {/* Gráfica de progreso circular */}
                <div className="progress-section">
                  <div className="circular-progress">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#e0e0e0"
                        strokeWidth="10"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={getProgressColor(course.completion)}
                        strokeWidth="10"
                        strokeDasharray={`${(course.completion / 100) * 314} 314`}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                      <text
                        x="60"
                        y="60"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="24"
                        fontWeight="bold"
                        fill={getProgressColor(course.completion)}
                      >
                        {course.completion}%
                      </text>
                    </svg>
                  </div>
                  
                  <div className="progress-stats">
                    <div className="stat">
                      <span className="stat-icon">📄</span>
                      <span className="stat-value">{course.completedTexts}/{course.totalTexts}</span>
                      <span className="stat-label">Textos</span>
                    </div>
                    <div className="stat">
                      <span className="stat-icon">✍️</span>
                      <span className="stat-value">{course.answeredQuestions}</span>
                      <span className="stat-label">Respuestas</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <button
                  className="btn-action btn-primary"
                  onClick={() => handleViewTexts(course)}
                >
                  📖 Ver Textos
                </button>
                <button
                  className="btn-action btn-secondary"
                  onClick={() => handleAnswerQuestions(course)}
                >
                  ✍️ Responder Preguntas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para seleccionar texto */}
      {showTextsModal && (
        <div className="modal-overlay" onClick={() => setShowTextsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 Selecciona un texto</h2>
              <button className="modal-close" onClick={() => setShowTextsModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {loadingTexts ? (
                <div className="loading-state">Cargando textos...</div>
              ) : courseTexts.length === 0 ? (
                <div className="empty-state">No hay textos disponibles en este curso</div>
              ) : (
                <div className="texts-list">
                  {courseTexts.map((text) => (
                    <div key={text.id} className="text-item" onClick={() => handleSelectTextToView(text)}>
                      <div className="text-item-header">
                        <h4>{text.title}</h4>
                        {text.hasAnswers && (
                          <span className="status-badge completed">✓ Respondido</span>
                        )}
                      </div>
                      <p>{text.source}</p>
                      <span className="text-difficulty">{text.difficulty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver contenido del texto */}
      {showTextDetailModal && selectedText && (
        <div className="modal-overlay" onClick={() => setShowTextDetailModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📖 {selectedText.title}</h2>
              <button className="modal-close" onClick={() => setShowTextDetailModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="text-detail">
                <div className="text-meta">
                  <span className="meta-badge">📄 {selectedText.source}</span>
                  <span className="meta-badge difficulty-badge">{selectedText.difficulty}</span>
                  <span className="meta-badge">⏱️ {selectedText.estimatedTime} min</span>
                </div>
                
                <div className="text-content">
                  {selectedText.content ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedText.content.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>No hay contenido disponible</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowTextDetailModal(false)}
              >
                Cerrar
              </button>
              <button
                className="btn-submit"
                onClick={handleOpenQuestionsFromText}
              >
                ✍️ Responder Preguntas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para responder preguntas */}
      {showQuestionsModal && (
        <div className="modal-overlay" onClick={() => setShowQuestionsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✍️ Responder Preguntas</h2>
              <button className="modal-close" onClick={() => setShowQuestionsModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {loadingQuestions ? (
                <div className="loading-state">Cargando preguntas...</div>
              ) : textQuestions.length === 0 ? (
                <div className="empty-state">No hay preguntas disponibles para este texto</div>
              ) : (
                <div className="questions-form">
                  <div className="text-info">
                    <h3>{selectedText?.title}</h3>
                    <p>
                      {Object.keys(answers).some(k => answers[k]) 
                        ? '📝 Ya has respondido estas preguntas. Puedes modificar tus respuestas y enviarlas nuevamente.'
                        : 'Responde todas las preguntas con claridad y detalle'
                      }
                    </p>
                  </div>
                  
                  {textQuestions.map((question, idx) => {
                    const attempt = questionAttempts[question.id];
                    const hasAnswer = !!answers[question.id];
                    const hasFeedback = attempt?.feedback || attempt?.autoFeedback;
                    
                    return (
                      <div key={question.id} className="question-block">
                        <div className="question-header">
                          <span className="question-number">Pregunta {idx + 1}</span>
                          {hasAnswer && (
                            <span className="answered-badge">✓ Respondida</span>
                          )}
                        </div>
                        <p className="question-text">{question.prompt}</p>
                        <textarea
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          placeholder="Escribe tu respuesta aquí..."
                          rows={4}
                          className="answer-textarea"
                        />
                        
                        {/* Botones de acción por pregunta */}
                        <div style={{ 
                          marginTop: '15px',
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap',
                          alignItems: 'center'
                        }}>
                          {/* Estado de la respuesta */}
                          {attempt && !attempt.isModified && (
                            <span style={{
                              padding: '6px 12px',
                              backgroundColor: '#d4edda',
                              color: '#155724',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              ✅ Enviada
                            </span>
                          )}
                          
                          {attempt?.isModified && (
                            <span style={{
                              padding: '6px 12px',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              ✏️ Modificada - Reenviar
                            </span>
                          )}
                          
                          {!attempt && hasAnswer && (
                            <span style={{
                              padding: '6px 12px',
                              backgroundColor: '#e7f3ff',
                              color: '#004085',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              ⏳ Pendiente
                            </span>
                          )}

                          {/* Botón de envío individual */}
                          {(!attempt || attempt.isModified) && hasAnswer && (
                            <button
                              onClick={() => handleSubmitSingleAnswer(question.id)}
                              disabled={submitting}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: attempt?.isModified ? '#ffc107' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                opacity: submitting ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!submitting) {
                                  e.target.style.opacity = '0.9';
                                  e.target.style.transform = 'translateY(-1px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!submitting) {
                                  e.target.style.opacity = '1';
                                  e.target.style.transform = 'translateY(0)';
                                }
                              }}
                            >
                              {attempt?.isModified ? '🔄 Reenviar' : '📤 Enviar Respuesta'}
                            </button>
                          )}
                        </div>
                        
                        {/* Sección de Feedback */}
                        {hasAnswer && attempt && (
                          <div className="feedback-section" style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                            {attempt.isModified && (
                              <div style={{
                                padding: '10px',
                                backgroundColor: '#fff3cd',
                                borderRadius: '6px',
                                marginBottom: '15px',
                                fontSize: '13px',
                                color: '#856404'
                              }}>
                                ⚠️ <strong>Aviso:</strong> Has modificado tu respuesta. El feedback anterior quedará invalidado. 
                                Reenvía tu respuesta para generar nuevo feedback.
                              </div>
                            )}
                            
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#555' }}>📋 Feedback:</h4>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {/* Botón: Analizar Sesgos (NUEVO) */}
                              <button
                                type="button"
                                onClick={() => handleAnalyzeBias(question.id)}
                                disabled={analyzingBias || attempt.isModified}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: attempt.isModified ? '#ccc' : '#ff9800',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: (analyzingBias || attempt.isModified) ? 'not-allowed' : 'pointer',
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: attempt.isModified ? 0.5 : 1,
                                  gap: '0.5rem'
                                }}
                              >
                                {analyzingBias ? '⏳ Analizando...' : '🔍 Analizar Sesgos'}
                              </button>
                              
                              {/* Botón: Generar Feedback con IA */}
                              <button
                                type="button"
                                onClick={() => handleGenerateFeedback(question.id)}
                                disabled={generatingFeedback || attempt.isModified}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: attempt.isModified ? '#ccc' : '#2196f3',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: (generatingFeedback || attempt.isModified) ? 'not-allowed' : 'pointer',
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: attempt.isModified ? 0.5 : 1,
                                  gap: '0.5rem'
                                }}
                              >
                                {generatingFeedback ? '⏳ Generando...' : '🤖 Generar Feedback con IA'}
                              </button>
                              
                              {/* Botón: Ver Feedback de IA (si existe) */}
                              {attempt.autoFeedback && (
                                <button
                                  type="button"
                                  onClick={() => !attempt.isModified && handleViewFeedback(question.id, 'ai')}
                                  disabled={attempt.isModified}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: attempt.isModified ? '#ccc' : '#673ab7',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: attempt.isModified ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    opacity: attempt.isModified ? 0.5 : 1
                                  }}
                                >
                                  👁️ Ver Feedback IA
                                </button>
                              )}
                              
                              {/* Botón: Ver Feedback del Docente (si existe) */}
                              {attempt.feedback && (
                                <button
                                  type="button"
                                  onClick={() => !attempt.isModified && handleViewFeedback(question.id, 'teacher')}
                                  disabled={attempt.isModified}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: attempt.isModified ? '#ccc' : '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: attempt.isModified ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    opacity: attempt.isModified ? 0.5 : 1
                                  }}
                                >
                                  👨‍🏫 Ver Feedback del Docente
                                </button>
                              )}
                            </div>
                            
                            {/* Indicadores de estado */}
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                              {!attempt.autoFeedback && !attempt.feedback && (
                                <p style={{ margin: 0 }}>ℹ️ Aún no hay feedback disponible. Genera uno con IA o espera el feedback del docente.</p>
                              )}
                              {attempt.autoFeedback && (
                                <p style={{ margin: 0 }}>✅ Feedback de IA disponible</p>
                              )}
                              {attempt.feedback && (
                                <p style={{ margin: 0 }}>✅ Feedback del docente disponible</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {textQuestions.length > 0 && (
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowQuestionsModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  className="btn-submit"
                  onClick={handleSubmitAnswers}
                  disabled={submitting}
                >
                  {submitting ? '⏳ Enviando...' : '📤 Enviar Respuestas'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para mostrar Feedback */}
      {showFeedbackModal && selectedFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2>
                {selectedFeedback.type === 'ai' ? '🤖 Feedback Generado por IA' : '👨‍🏫 Feedback del Docente'}
              </h2>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
              <div style={{
                background: selectedFeedback.type === 'ai' ? '#e3f2fd' : '#e8f5e9',
                border: `2px solid ${selectedFeedback.type === 'ai' ? '#2196f3' : '#4caf50'}`,
                borderRadius: '12px',
                padding: '1.5rem',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                fontSize: '0.95rem'
              }}>
                {selectedFeedback.feedback}
              </div>
              
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#fff3e0',
                borderLeft: '4px solid #ff9800',
                borderRadius: '4px'
              }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#e65100' }}>
                  💡 <strong>Consejo:</strong> Lee cuidadosamente el feedback y úsalo para mejorar tu comprensión del tema. 
                  {selectedFeedback.type === 'ai' && ' Recuerda que este feedback es generado automáticamente y puede complementarse con el feedback de tu docente.'}
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn-submit"
                onClick={() => setShowFeedbackModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Modal para mostrar Análisis de Sesgos */}
      {showBiasModal && biasAnalysis && (
        <div className="modal-overlay" onClick={() => setShowBiasModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column', maxWidth: '800px' }}>
            
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <h2>🔍 Análisis de Sesgos en tu Respuesta</h2>
              <button className="modal-close" onClick={() => setShowBiasModal(false)} style={{ color: 'white' }}>✕</button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
              
              {/* Reporte de CORA (análisis didáctico) */}
              {biasAnalysis.didacticReport && (
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  border: '2px solid #e3f2fd'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#1976d2', fontSize: '1.1rem' }}>
                    📚 Análisis Detallado
                  </h3>
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '0.95rem',
                    color: '#333'
                  }}>
                    {typeof biasAnalysis.didacticReport === 'string' 
                      ? biasAnalysis.didacticReport 
                      : biasAnalysis.didacticReport?.raw || biasAnalysis.didacticReport?.text || JSON.stringify(biasAnalysis.didacticReport, null, 2)
                    }
                  </div>
                </div>
              )}

              {/* Solo mensaje sin sesgos si aplica */}
              {(!biasAnalysis.biases || biasAnalysis.biases.length === 0) && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  border: '2px solid #4caf50',
                  marginTop: '1rem'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
                  <h3 style={{ color: '#4caf50', marginBottom: '0.5rem' }}>¡Excelente Trabajo!</h3>
                  <p style={{ color: '#666', margin: 0 }}>
                    Tu respuesta no presenta sesgos significativos. Muestra un buen pensamiento crítico y argumentación equilibrada.
                  </p>
                </div>
              )}

              {/* Mensaje motivador */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                marginTop: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💪</div>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                  <strong>Recuerda:</strong> El análisis de sesgos es una herramienta de aprendizaje. 
                  Identifica estos patrones para desarrollar un pensamiento crítico más sólido y respuestas académicas de mayor calidad.
                </p>
              </div>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
              {/* Indicador de guardado */}
              {biasAnalysis?.saved && biasAnalysis?.analyzedAt && (
                <span style={{ 
                  fontSize: '0.85rem', 
                  color: '#666',
                  alignSelf: 'center'
                }}>
                  💾 Guardado el {new Date(biasAnalysis.analyzedAt).toLocaleString('es-ES')}
                </span>
              )}
              
              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!biasAnalysis.saved && (
                  <button
                    className="btn-submit"
                    onClick={handleSaveBiasAnalysis}
                    style={{ background: '#10b981', flex: 1, minWidth: '150px' }}
                  >
                    💾 Guardar Análisis
                  </button>
                )}
                
                {biasAnalysis.saved && (
                  <button
                    className="btn-submit"
                    onClick={handleRegenerateBiasAnalysis}
                    style={{ background: '#f59e0b', flex: 1, minWidth: '150px' }}
                  >
                    🔄 Regenerar Análisis
                  </button>
                )}
                
                <button
                  className="btn-submit"
                  onClick={() => setShowBiasModal(false)}
                  style={{ background: '#667eea', flex: 1, minWidth: '150px' }}
                >
                  ✅ Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Tutor Personal Flotante */}
      <StudentChatbot 
        currentText={selectedText}
        currentCourse={selectedCourse}
      />
    </div>
  );
};

export default StudentEvaluationPage;
