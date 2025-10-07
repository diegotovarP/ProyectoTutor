import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import './AvailableCoursesPage.css';

const AvailableCoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      setLoading(true);
      const { data } = await client.get('/courses/available');
      setAvailableCourses(data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    if (!window.confirm('¿Estás seguro de que quieres matricularte en este curso?')) {
      return;
    }

    try {
      setEnrolling(courseId);
      await client.post('/enrollments', {
        studentId: user._id,
        courseId: courseId
      });

      alert('✅ ¡Te has matriculado exitosamente!');

      fetchAvailableCourses();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al matricularse');
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return (
      <div className="available-courses-page">
        <div className="loading">Cargando cursos disponibles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="available-courses-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="available-courses-page">
      <div className="page-header">
        <h1>📚 Cursos Disponibles</h1>
        <p>Explora y matricúlate en los cursos que te interesen</p>
      </div>

      {availableCourses.length === 0 ? (
        <div className="empty-state">
          <p>🎓 No hay cursos disponibles en este momento</p>
          <p className="empty-subtitle">Ya estás matriculado en todos los cursos activos</p>
        </div>
      ) : (
        <div className="courses-grid">
          {availableCourses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-card-header">
                <h3>{course.title}</h3>
                {course.tags && course.tags.length > 0 && (
                  <div className="course-tags">
                    {course.tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="course-card-body">
                <p className="course-description">{course.description}</p>

                <div className="course-meta">
                  <div className="meta-item">
                    <span className="meta-icon">👨‍🏫</span>
                    <span>{course.owner}</span>
                  </div>

                  {course.objectives && course.objectives.length > 0 && (
                    <div className="meta-item">
                      <span className="meta-icon">🎯</span>
                      <span>{course.objectives.length} objetivos</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="course-card-footer">
                <button
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrolling === course.id}
                  className="btn-enroll"
                >
                  {enrolling === course.id ? '⏳ Matriculando...' : '✅ Matricularme'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableCoursesPage;
