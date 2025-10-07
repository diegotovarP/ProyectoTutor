import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './AuthPages.css';

const LoginPage = () => {
  const { login, isLoading, error, setError, forgotPassword } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [forgotMessage, setForgotMessage] = useState('');

  const handleChange = (evt) => {
    setForm((prev) => ({ ...prev, [evt.target.name]: evt.target.value }));
    setError(null);
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    try {
      await login(form);
    } catch (err) {
      console.warn('Login fallido', err);
    }
  };

  const handleForgot = async () => {
    try {
      const message = await forgotPassword(form.email);
      setForgotMessage(message);
    } catch (err) {
      setForgotMessage(err.message);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div>
        <h2>Bienvenido de nuevo</h2>
        <p className="helper">Ingresa para seguir tus cursos y retos de pensamiento crítico.</p>
      </div>

      <div className="auth-form__fields">
        <div className="field">
          <label htmlFor="email">Correo institucional</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="tu.nombre@institucion.edu"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {forgotMessage && <div className="auth-info">{forgotMessage}</div>}

      <div className="auth-actions">
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? 'Ingresando…' : 'Entrar al panel'}
        </button>
        <button
          type="button"
          className="button-link"
          onClick={handleForgot}
          disabled={!form.email}
        >
          Olvidé mi contraseña
        </button>
        <span className="auth-footer">
          ¿Aún no tienes cuenta? <Link to="/register">Crea tu perfil</Link>
        </span>
      </div>
    </form>
  );
};

export default LoginPage;
