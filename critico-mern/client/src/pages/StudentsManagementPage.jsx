import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import './StudentsManagementPage.css';

const StudentsManagementPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showTextsModal, setShowTextsModal] = useState(false);
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStudents, setCourseStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentTexts, setStudentTexts] = useState([]);
  const [selectedText, setSelectedText] = useState(null);
  const [textAnswers, setTextAnswers] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchTeacherCourses();
  }, [user]);

  const fetchTeacherCourses = async () => {
    try {
      setLoading(true);
      const { data } = await client.get('/courses/mine');
      setCourses(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = async (course) => {
    setSelectedCourse(course);
    setShowStudentsModal(true);
    setLoadingStudents(true);

    try {

      const { data } = await client.get(`/courses/${course.id}/students`);
      setCourseStudents(data.students || []);
    } catch (err) {
      alert('Error al cargar estudiantes del curso');
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewStudentTexts = async (student) => {
    setSelectedStudent(student);
    setShowStudentsModal(false);
    setShowTextsModal(true);
    setLoadingTexts(true);

    try {

      const { data } = await client.get(`/courses/${selectedCourse.id}/student/${student._id}/texts-progress`);
      setStudentTexts(data.texts || []);
    } catch (err) {
      alert('Error al cargar progreso del estudiante');
      console.error(err);
    } finally {
      setLoadingTexts(false);
    }
  };

  const handleViewAnswers = async (text) => {
    setSelectedText(text);
    setShowTextsModal(false);
    setShowAnswersModal(true);
    setLoadingAnswers(true);

    try {

      const { data } = await client.get(`/attempts/text/${text.id}/student/${selectedStudent._id}`);
      setTextAnswers(data.attempts || []);
    } catch (err) {
      alert('Error al cargar respuestas del estudiante');
      console.error(err);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleOpenFeedback = (attempt) => {
    setSelectedAttemptId(attempt._id);
    setSelectedAttempt(attempt);
    setFeedback(attempt.feedback || '');
    setShowAnswersModal(false);
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      alert('Por favor escribe una retroalimentación');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await client.put(`/attempts/${selectedAttemptId}/feedback`, {
        feedback: feedback.trim()
      });
      alert('✅ Retroalimentación guardada exitosamente');
      setShowFeedbackModal(false);
      setShowAnswersModal(true);

      handleViewAnswers(selectedText);
    } catch (err) {
      alert('Error al guardar retroalimentación');
      console.error(err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCloseAllModals = () => {
    setShowStudentsModal(false);
    setShowTextsModal(false);
    setShowAnswersModal(false);
    setShowFeedbackModal(false);
    setSelectedCourse(null);
    setSelectedStudent(null);
    setSelectedText(null);
    setTextAnswers([]);
    setFeedback('');
  };

  const handleBackToStudents = () => {
    setShowTextsModal(false);
    setShowStudentsModal(true);
  };

  const handleBackToTexts = () => {
    setShowAnswersModal(false);
    setShowTextsModal(true);
  };

  const handleBackToAnswers = () => {
    setShowFeedbackModal(false);
    setShowAnswersModal(true);
  };

  if (loading) {
    return (
      <div className="students-management-page">
        <div className="loading">Cargando cursos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="students-management-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="students-management-page">
      <div className="page-header">
        <h1>👥 Gestión de Estudiantes</h1>
        <p>Revisa el progreso de tus estudiantes y proporciona retroalimentación</p>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>📚 No tienes cursos creados aún</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <h3>{course.title}</h3>
              <p className="course-description">{course.description}</p>
              <button
                className="btn-view-students"
                onClick={() => handleViewStudents(course)}
              >
                👥 Ver Estudiantes
              </button>
            </div>
          ))}
        </div>
      )}

      {showStudentsModal && selectedCourse && (
        <div className="modal-overlay" onClick={handleCloseAllModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Estudiantes de: {selectedCourse.title}</h2>
              <button className="modal-close" onClick={handleCloseAllModals}>✕</button>
            </div>
            <div className="modal-body">
              {loadingStudents ? (
                <p>Cargando estudiantes...</p>
              ) : courseStudents.length === 0 ? (
                <p className="empty-message">No hay estudiantes matriculados en este curso</p>
              ) : (
                <div className="students-list">
                  {courseStudents.map((student) => (
                    <div
                      key={student._id}
                      className="student-item"
                      onClick={() => handleViewStudentTexts(student)}
                    >
                      <div className="student-avatar">{student.firstName?.[0]?.toUpperCase()}</div>
                      <div className="student-info">
                        <strong>{student.firstName} {student.lastName}</strong>
                        <span>{student.email}</span>
                      </div>
                      <div className="student-progress">
                        <span className="progress-text">{student.progress}% completado</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTextsModal && selectedStudent && (
        <div className="modal-overlay" onClick={handleCloseAllModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Progreso de: {selectedStudent.firstName} {selectedStudent.lastName}</h2>
              <button className="modal-close" onClick={handleCloseAllModals}>✕</button>
            </div>
            <div className="modal-body">
              {loadingTexts ? (
                <p>Cargando textos...</p>
              ) : studentTexts.length === 0 ? (
                <p className="empty-message">No hay textos disponibles</p>
              ) : (
                <div className="texts-list">
                  {studentTexts.map((text) => (
                    <div
                      key={text.id}
                      className={`text-item ${text.hasAnswered ? 'answered' : 'pending'}`}
                      onClick={() => text.hasAnswered && handleViewAnswers(text)}
                    >
                      <div className="text-header">
                        <h4>{text.title}</h4>
                        {text.hasAnswered ? (
                          <span className="status-badge completed">✓ Respondido</span>
                        ) : (
                          <span className="status-badge pending">⏳ Pendiente</span>
                        )}
                      </div>
                      <p>{text.source}</p>
                      {text.hasAnswered && (
                        <small className="click-hint">Click para ver respuestas</small>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="button-secondary" onClick={handleBackToStudents}>← Volver a estudiantes</button>
            </div>
          </div>
        </div>
      )}

      {showAnswersModal && selectedText && (
        <div className="modal-overlay" onClick={handleCloseAllModals}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Respuestas de: {selectedText.title}</h2>
              <button className="modal-close" onClick={handleCloseAllModals}>✕</button>
            </div>
            <div className="modal-body">
              {loadingAnswers ? (
                <p>Cargando respuestas...</p>
              ) : textAnswers.length === 0 ? (
                <p className="empty-message">No hay respuestas disponibles</p>
              ) : (
                <div className="answers-list">
                  {textAnswers.map((attempt, index) => (
                    <div key={attempt._id} className="answer-item">
                      <div className="question-section">
                        <h4>Pregunta {index + 1}</h4>
                        <p className="question-text">{attempt.question?.prompt || 'Pregunta no disponible'}</p>
                      </div>
                      <div className="answer-section">
                        <h5>Respuesta del estudiante:</h5>
                        <p className="student-answer">{attempt.answers?.[0]?.value || 'Sin respuesta'}</p>
                      </div>

                      {attempt.autoFeedback && (
                        <div className="feedback-section" style={{
                          backgroundColor: '#e3f2fd',
                          border: '2px solid #2196f3',
                          borderRadius: '8px',
                          padding: '15px',
                          marginTop: '15px'
                        }}>
                          <h5 style={{ color: '#1976d2', marginBottom: '10px' }}>🤖 Feedback Generado por IA</h5>
                          <div className="feedback-text" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                            {attempt.autoFeedback}
                          </div>
                          {attempt.feedbackGeneratedAt && (
                            <small style={{ color: '#666', marginTop: '10px', display: 'block' }}>
                              Generado el: {new Date(attempt.feedbackGeneratedAt).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </small>
                          )}
                        </div>
                      )}

                      {attempt.feedback && (
                        <div className="feedback-section" style={{
                          backgroundColor: '#e8f5e9',
                          border: '2px solid #4caf50',
                          borderRadius: '8px',
                          padding: '15px',
                          marginTop: '15px'
                        }}>
                          <h5 style={{ color: '#2e7d32', marginBottom: '10px' }}>�‍🏫 Tu Retroalimentación</h5>
                          <p className="feedback-text" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                            {attempt.feedback}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                        <button
                          className="btn-feedback"
                          onClick={() => handleOpenFeedback(attempt)}
                          style={{
                            flex: '1',
                            minWidth: '200px'
                          }}
                        >
                          {attempt.feedback ? '✏️ Editar Mi Retroalimentación' : '💬 Dar Retroalimentación'}
                        </button>

                        {!attempt.autoFeedback && (
                          <span style={{
                            padding: '8px 16px',
                            backgroundColor: '#fff3cd',
                            color: '#856404',
                            borderRadius: '6px',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            ℹ️ El estudiante puede generar feedback con IA
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="button-secondary" onClick={handleBackToTexts}>← Volver a textos</button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && selectedAttempt && (
        <div className="modal-overlay" onClick={handleCloseAllModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💬 Retroalimentación</h2>
              <button className="modal-close" onClick={handleCloseAllModals}>✕</button>
            </div>
            <div className="modal-body">

              <div className="feedback-question-section">
                <h4>📝 Pregunta:</h4>
                <p className="feedback-question-text">
                  {selectedAttempt.question?.prompt || 'Pregunta no disponible'}
                </p>
              </div>

              <div className="feedback-answer-section">
                <h4>✍️ Respuesta del estudiante:</h4>
                <p className="feedback-student-answer">
                  {selectedAttempt.answers?.[0]?.value || 'Sin respuesta'}
                </p>
              </div>

              {selectedAttempt.autoFeedback && (
                <div style={{
                  backgroundColor: '#e3f2fd',
                  border: '2px solid #2196f3',
                  borderRadius: '8px',
                  padding: '15px',
                  marginTop: '20px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ color: '#1976d2', marginBottom: '10px' }}>🤖 Feedback de IA (Referencia)</h4>
                  <p style={{
                    fontSize: '13px',
                    color: '#666',
                    marginBottom: '15px',
                    fontStyle: 'italic'
                  }}>
                    Este es el feedback que la IA generó. Puedes usarlo como referencia para tu retroalimentación:
                  </p>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    whiteSpace: 'pre-line',
                    lineHeight: '1.6',
                    fontSize: '14px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {selectedAttempt.autoFeedback}
                  </div>
                  {selectedAttempt.feedbackGeneratedAt && (
                    <small style={{ color: '#666', marginTop: '10px', display: 'block' }}>
                      Generado el: {new Date(selectedAttempt.feedbackGeneratedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </small>
                  )}
                </div>
              )}

              <div className="feedback-input-section">
                <h4>💭 Tu retroalimentación:</h4>
                <p className="feedback-instructions">
                  Proporciona retroalimentación constructiva para ayudar al estudiante a mejorar:
                </p>
                <textarea
                  className="feedback-textarea"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escribe tu retroalimentación aquí..."
                  rows={6}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="button-secondary" onClick={handleBackToAnswers}>Cancelar</button>
              <button
                className="button-primary"
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? 'Guardando...' : '💾 Guardar Retroalimentación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagementPage;
