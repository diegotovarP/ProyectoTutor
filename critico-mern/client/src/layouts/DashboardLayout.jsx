import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import StudentChatbot from '../components/StudentChatbot';
import './DashboardLayout.css';

const teacherNavItems = [
  { to: '/app', label: 'Panel' },
  { to: '/app/courses', label: 'Cursos' },
  { to: '/app/students', label: 'Estudiantes' },
  { to: '/app/analytics', label: 'Analíticas', disabled: true },
  { to: '/app/messages', label: 'Mensajes', disabled: true },
  { to: '/app/settings', label: 'Ajustes', disabled: true }
];

const studentNavItems = [
  { to: '/app', label: 'Panel' },
  { to: '/app/student/available-courses', label: 'Cursos Disponibles' },
  { to: '/app/student/evaluation', label: 'Evaluación' },
  { to: '/app/messages', label: 'Mensajes', disabled: true },
  { to: '/app/settings', label: 'Ajustes', disabled: true }
];

const DashboardLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = user?.role === 'student' ? studentNavItems : teacherNavItems;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <span className="logo-cube" />
          <span>critico</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.disabled ? location.pathname : item.to}
              className={({ isActive }) => [
                'sidebar-link',
                isActive ? 'active' : '',
                item.disabled ? 'disabled' : ''
              ].join(' ')}
            >
              {item.label}
              {item.disabled && <span className="badge-soon">Pronto</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="avatar-letter">{user?.firstName?.[0]?.toUpperCase() || 'U'}</div>
            <div>
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <span className="user-role">{user?.role === 'teacher' ? 'Docente' : user?.role === 'admin' ? 'Administrador' : 'Estudiante'}</span>
            </div>
          </div>
          <button type="button" className="button-ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="dashboard-content">
        <Outlet />
      </main>

      {user?.role === 'student' && <StudentChatbot />}
    </div>
  );
};

export default DashboardLayout;
