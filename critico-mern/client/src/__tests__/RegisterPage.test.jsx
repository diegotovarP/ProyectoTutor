import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

jest.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: jest.fn()
}));

describe('RegisterPage', () => {
  const register = jest.fn();
  const setError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    register.mockResolvedValue();
    useAuth.mockReturnValue({
      register,
      isLoading: false,
      error: null,
      setError
    });
  });

  it('envía el formulario con los valores capturados', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/apellido/i), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText(/correo institucional/i), { target: { value: 'ana@critico.edu' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/rol/i), { target: { value: 'teacher' } });

    fireEvent.submit(screen.getByRole('button', { name: /unirme a critico/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@critico.edu',
        password: 'Password123',
        role: 'teacher'
      });
    });
  });

  it('limpia errores al modificar campos', () => {
    const setErrorMock = jest.fn();
    useAuth.mockReturnValueOnce({
      register,
      isLoading: false,
      error: 'Correo en uso',
      setError: setErrorMock
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Correo en uso')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Ana' } });

    expect(setErrorMock).toHaveBeenCalledWith(null);
  });

  it('muestra estado de carga en el botón', () => {
    useAuth.mockReturnValueOnce({
      register,
      isLoading: true,
      error: null,
      setError
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /creando cuenta/i });
    expect(button).toBeDisabled();
  });
});
