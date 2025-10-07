import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './AuthPages.css';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'student'
};

const RegisterPage = () => {
  const { register, isLoading, error, setError } = useAuth();
  const [form, setForm] = useState(initialForm);

  const handleChange = (evt) => {
    setForm((prev) => ({ ...prev, [evt.target.name]: evt.target.value }));
    setError(null);
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    try {
      await register(form);
    } catch (err) {
      console.warn('Registro fallido', err);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div>
        <h2>Crea tu cuenta</h2>
        <p className="helper">Elige tu rol para personalizar paneles y recomendaciones.</p>
      </div>

      <div className="auth-form__fields">
        <div className="field">
          <label htmlFor="firstName">Nombre</label>
          <input
            id="firstName"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="Mariana"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Apellido</label>
          <input
            id="lastName"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Soto"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Correo institucional</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="mariana.soto@critico.edu"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="role">Rol</label>
          <select id="role" name="role" value={form.role} onChange={handleChange}>
            <option value="student">Estudiante</option>
            <option value="teacher">Docente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-actions">
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? 'Creando cuenta…' : 'Unirme a Critico'}
        </button>
        <span className="auth-footer">
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
        </span>
      </div>
    </form>
  );
};

export default RegisterPage;
