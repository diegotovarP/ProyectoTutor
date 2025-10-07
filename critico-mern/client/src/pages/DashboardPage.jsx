import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext.jsx';
import './DashboardPage.css';

const recommended = [
  {
    id: 'rec-1',
    level: 'Beginner',
    title: 'Herramientas para detectar sesgos cotidianos',
    mentor: 'Laura Paz',
    rating: 4.9
  },
  {
    id: 'rec-2',
    level: 'Intermediate',
    title: 'Argumentación basada en evidencia científica',
    mentor: 'Diego Ortega',
    rating: 4.8
  },
  {
    id: 'rec-3',
    level: 'Advanced',
    title: 'Pensamiento crítico aplicado a políticas públicas',
    mentor: 'Ada Min',
    rating: 5
  }
];

const DashboardPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);

  useEffect(() => {
    if (user?.role === 'student') {
      fetchStudentProgress();
    } else {
      fetchCourses();
    }
  }, [user]);

  const fetchStudentProgress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await client.get(`/enrollments/student/${user._id}/progress`);
      setStudentProgress(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar tu progreso');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await client.get('/courses/mine');
      setCourses(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar tus cursos');
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role === 'student') {
    return (
      <div className="dashboard-grid">
        <section className="welcome-card-simple fade-in">
          <h1>Hola, {user?.firstName} 👋</h1>
        </section>

        {isLoading && <p>Cargando progreso...</p>}
        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && studentProgress && studentProgress.progress && studentProgress.progress.length > 0 && (
          <section className="student-progress fade-in">
            <h2>Tu Progreso</h2>
            <div className="progress-cards">
              {studentProgress.progress.map((courseData) => (
                <div key={courseData.courseId} className="progress-card">
                  <h3>{courseData.courseTitle}</h3>
                  <div className="progress-stats">
                    <div className="stat-item">
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
                            stroke="#ffc107"
                            strokeWidth="10"
                            strokeDasharray={`${(courseData.completion / 100) * 314} 314`}
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
                            fill="#ffc107"
                          >
                            {courseData.completion}%
                          </text>
                        </svg>
                      </div>
                    </div>
                    <div className="stats-grid">
                      <div className="stat-box">
                        <span className="stat-icon">📄</span>
                        <div>
                          <strong>{courseData.completedTexts}/{courseData.totalTexts}</strong>
                          <p>Textos</p>
                        </div>
                      </div>
                      <div className="stat-box">
                        <span className="stat-icon">✍️</span>
                        <div>
                          <strong>{courseData.answeredQuestions}</strong>
                          <p>Respuestas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && !error && studentProgress && studentProgress.progress && studentProgress.progress.length > 0 && (
          <section className="my-courses fade-in">
            <div className="section-header">
              <h2>Mis cursos</h2>
              <Link to="/app/student/evaluation">Ver tablero</Link>
            </div>
            <ul className="course-list">
              {studentProgress.progress.map((courseData) => (
                <li key={courseData.courseId} className="course-item">
                  <div>
                    <strong>{courseData.courseTitle}</strong>
                    <p>Progreso: {courseData.completion}% • Vence 8/10/2025</p>
                  </div>
                  <span className="progress-badge">{courseData.completion}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="welcome-card fade-in">
        <div>
          <h1>Hola, {user?.firstName} 👋</h1>
          <p>
            Continúa fortaleciendo tus habilidades de inferencia, evidencia y contraargumento. Aquí tienes recomendaciones para hoy.
          </p>
        </div>
        <Link to="/app/courses" className="button-primary">Ir a mis cursos</Link>
      </section>

      <section className="recommended fade-in">
        <div className="section-header">
          <h2>Recomendados para ti</h2>
          <Link to="/app/courses">Ver todos</Link>
        </div>
        <div className="recommend-grid">
          {recommended.map((item) => (
            <article key={item.id} className="recommend-card">
              <span className={`badge level-${item.level.toLowerCase()}`}>{item.level}</span>
              <h3>{item.title}</h3>
              <div className="recommend-meta">
                <span>{item.mentor}</span>
                <span>{item.rating.toFixed(1)} ★</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="my-courses fade-in">
        <div className="section-header">
          <h2>Mis cursos</h2>
          <Link to="/app/courses">Ver tablero</Link>
        </div>
        {isLoading && <p>Cargando cursos…</p>}
        {error && <p className="error-text">{error}</p>}
        {!isLoading && !error && (
          <ul className="course-list">
            {courses.length === 0 && <li>Aún no tienes cursos asignados.</li>}
            {courses.map((course) => (
              <li key={course.id} className="course-item">
                <div>
                  <strong>{course.title}</strong>
                  <p>{course.description}</p>
                </div>
                <div className="course-progress">
                  <span>{course.progress}%</span>
                  {course.dueSoon && (
                    <span className="badge badge-warning">
                      Vence {new Date(course.dueSoon.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
