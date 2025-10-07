import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext.jsx';
import './CoursesPage.css';

const CoursesPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', reminders: [] });
  const canCreate = useMemo(() => user?.role === 'teacher' || user?.role === 'admin', [user]);

  const fetchCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await client.get('/courses/mine');
      setCourses(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos cargar los cursos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleChange = (evt) => {
    setForm((prev) => ({ ...prev, [evt.target.name]: evt.target.value }));
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    try {
      if (editingCourse) {
        await client.patch(`/courses/${editingCourse.id}`, {
          title: form.title,
          description: form.description
        });
      } else {
        await client.post('/courses', {
          title: form.title,
          description: form.description,
          reminders: [
            {
              dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
              type: 'due_soon'
            }
          ]
        });
      }
      handleCloseForm();
      await fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || `No se pudo ${editingCourse ? 'actualizar' : 'crear'} el curso`);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setForm({ title: course.title, description: course.description || '' });
    setShowModal(true);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este curso? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await client.delete(`/courses/${courseId}`);
      await fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el curso');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setForm({ title: '', description: '', reminders: [] });
    setError(null);
  };

  return (
    <div className="courses-page fade-in">
      <header className="courses-header">
        <div>
          <h1>Mis cursos</h1>
          <p>
            Organiza tus cursos, revisa progreso de tus estudiantes y crea nuevas experiencias de lectura crítica.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="button-primary" onClick={() => setShowModal(true)}>
            Nuevo curso
          </button>
        )}
      </header>

      {error && <p className="error-text">{error}</p>}
      {isLoading && <p>Cargando…</p>}

      <section className="courses-grid">
        {courses.map((course) => (
          <article key={course.id} className="course-card">
            <header>
              <span className="badge badge-gradient">{course.level || 'Hábito crítico'}</span>
              {course.dueSoon && (
                <span className="badge badge-warning">Vence pronto</span>
              )}
            </header>
            <h3>{course.title}</h3>
            <p>{course.description || 'Sin descripción'}</p>
            <div className="course-meta">
              <div>
                <span className="meta-title">Progreso</span>
                <strong>{course.progress}%</strong>
              </div>
              <div>
                <span className="meta-title">Nivel</span>
                <strong>{course.level || 'Inc. crítico'}</strong>
              </div>
            </div>
            <div className="course-actions">
              <Link to={`/app/courses/${course.id}`} className="button-secondary">Ver temas</Link>
              {canCreate && (
                <div className="course-menu">
                  <button
                    type="button"
                    className="button-tertiary"
                    onClick={() => handleEditCourse(course)}
                    title="Editar curso"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="button-tertiary danger"
                    onClick={() => handleDeleteCourse(course.id)}
                    title="Eliminar curso"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}

        {courses.length === 0 && !isLoading && (
          <div className="empty-state">
            <h3>No hay cursos aún</h3>
            <p>Crea un curso para empezar a asignar temas y textos a tus estudiantes.</p>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCourse ? 'Editar curso' : 'Nuevo curso'}</h2>
              <button type="button" className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form className="course-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="title">Nombre del curso *</label>
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ej: Taller de Proyectos 2"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Comparte los objetivos y habilidades que reforzará el curso"
                />
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="modal-footer">
                <button type="button" className="button-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="button-primary">
                  {editingCourse ? 'Actualizar curso' : 'Guardar curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
