import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const AuthContext = createContext();

const STORAGE_KEY = 'critico_auth';

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('No se pudo leer el estado de auth', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [state, setState] = useState(() => readStoredAuth() || { user: null, token: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!state.token) {
      localStorage.removeItem('auth_token');
    } else {
      localStorage.setItem('auth_token', state.token);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await client.post('/auth/login', credentials);
      setState({ user: data.user, token: data.token });
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await client.post('/auth/register', payload);
      setState({ user: data.user, token: data.token });
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      const { data } = await client.post('/auth/forgot-password', { email });
      return data.message;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'No se pudo procesar la solicitud');
    }
  };

  const logout = () => {
    setState({ user: null, token: null });
    navigate('/login');
  };

  const value = useMemo(() => ({
    ...state,
    isLoading,
    error,
    login,
    register,
    forgotPassword,
    logout,
    setError
  }), [state, isLoading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
};
