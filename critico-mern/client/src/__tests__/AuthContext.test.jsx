import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx';
import client from '../api/client.js';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => jest.fn()
  };
});

jest.mock('../api/client.js', () => ({
  post: jest.fn()
}));

const wrapper = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('AuthContext', () => {
  it('stores token and user after login', async () => {
    client.post.mockResolvedValueOnce({
      data: {
        user: { email: 'teacher@example.com' },
        token: 'jwt-token'
      }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'teacher@example.com', password: 'Password123' });
    });

    expect(result.current.token).toBe('jwt-token');
    expect(result.current.user.email).toBe('teacher@example.com');
    expect(localStorage.getItem('critico_auth')).toContain('jwt-token');
    expect(localStorage.getItem('auth_token')).toBe('jwt-token');
  });

  it('handles login errors and exposes message', async () => {
    client.post.mockRejectedValueOnce({ response: { data: { message: 'Credenciales inválidas' } } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await expect(result.current.login({ email: 'fail@test.com', password: 'bad' })).rejects.toBeDefined();
    });

    expect(result.current.error).toBe('Credenciales inválidas');
  });

  it('allows requesting password reset and surfaces backend message', async () => {
    client.post.mockResolvedValueOnce({ data: { message: 'Correo enviado' } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    const response = await result.current.forgotPassword('student@example.com');
    expect(response).toBe('Correo enviado');
    expect(client.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'student@example.com' });
  });

  it('clears state on logout', async () => {
    client.post.mockResolvedValueOnce({
      data: {
        user: { email: 'teacher@example.com' },
        token: 'jwt-token'
      }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'teacher@example.com', password: 'Password123' });
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
