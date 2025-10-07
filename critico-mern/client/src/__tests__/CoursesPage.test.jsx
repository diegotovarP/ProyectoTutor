import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CoursesPage from '../pages/CoursesPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import client from '../api/client';

jest.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: jest.fn()
}));

jest.mock('../api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}));

describe('CoursesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => render(
    <MemoryRouter>
      <CoursesPage />
    </MemoryRouter>
  );

  it('muestra listado de cursos y botón de creación para docentes', async () => {
    useAuth.mockReturnValue({
      user: { role: 'teacher' }
    });

    client.get.mockResolvedValueOnce({
      data: [
        {
          id: 'course-1',
          title: 'Taller de pensamiento crítico',
          description: 'Aprende a detectar sesgos',
          progress: 42
        }
      ]
    });

    renderPage();

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/courses/mine');
    });

    expect(screen.getByRole('button', { name: /nuevo curso/i })).toBeInTheDocument();
    expect(screen.getByText('Taller de pensamiento crítico')).toBeInTheDocument();
  });

  it('oculta el botón de creación para estudiantes', async () => {
    useAuth.mockReturnValue({
      user: { role: 'student' }
    });

    client.get.mockResolvedValueOnce({ data: [] });

    renderPage();

    await waitFor(() => {
      expect(client.get).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: /nuevo curso/i })).not.toBeInTheDocument();
  });

  it('muestra mensaje de error cuando la petición falla', async () => {
    useAuth.mockReturnValue({
      user: { role: 'teacher' }
    });

    client.get.mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no pudimos cargar los cursos/i)).toBeInTheDocument();
    });
  });
});
