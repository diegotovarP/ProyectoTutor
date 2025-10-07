import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

jest.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: jest.fn()
}));

describe('LoginPage', () => {
  const login = jest.fn();
  const setError = jest.fn();
  const forgotPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      login,
      isLoading: false,
      error: null,
      setError,
      forgotPassword
    });
  });

  it('envía credenciales al iniciar sesión', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/correo institucional/i), { target: { name: 'email', value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { name: 'password', value: 'Password123' } });

    fireEvent.submit(screen.getByRole('button', { name: /entrar al panel/i }));

    expect(login).toHaveBeenCalledWith({ email: 'user@test.com', password: 'Password123' });
  });

  it('muestra mensaje de error cuando existe', () => {
    useAuth.mockReturnValueOnce({
      login,
      isLoading: false,
      error: 'Credenciales inválidas',
      setError,
      forgotPassword
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
  });

  it('habilita flujo de recuperación de contraseña', async () => {
    forgotPassword.mockResolvedValue('Correo enviado');

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/correo institucional/i), { target: { name: 'email', value: 'student@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /olvidé mi contraseña/i }));

    expect(forgotPassword).toHaveBeenCalledWith('student@test.com');
    expect(await screen.findByText('Correo enviado')).toBeInTheDocument();
  });
});
