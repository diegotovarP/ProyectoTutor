import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

jest.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: jest.fn()
}));

describe('ProtectedRoute', () => {
  it('redirects to login when token is missing', () => {
    useAuth.mockReturnValue({ token: null });

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/privado" element={<div>Zona segura</div>} />
          </Route>
          <Route path="/login" element={<div>Pantalla de login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('muestra el contenido protegido cuando el token existe', () => {
    useAuth.mockReturnValue({ token: 'jwt-token' });

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/privado" element={<div>Zona segura</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Zona segura')).toBeInTheDocument();
  });
});
