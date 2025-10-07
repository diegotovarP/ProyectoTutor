import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

const AuthLayout = () => (
  <div className="auth-shell">
    <div className="auth-gradient" />
    <div className="auth-card fade-in">
      <div className="auth-card__branding">
        <div className="auth-logo">critico</div>
        <h1>Impulsa tu pensamiento crítico</h1>
        <p>
          Aprende a detectar sesgos, argumentar con evidencia y mejora cada lectura con feedback inmediato.
        </p>
        <ul>
          <li>Sesiones personalizadas según tu progreso</li>
          <li>Preguntas automáticas por habilidad</li>
          <li>Seguimiento de avance en tiempo real</li>
        </ul>
      </div>
      <div className="auth-card__content">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AuthLayout;
