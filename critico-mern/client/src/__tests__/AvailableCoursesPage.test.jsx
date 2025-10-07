import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AvailableCoursesPage from '../pages/AvailableCoursesPage.jsx';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}));

describe('AvailableCoursesPage', () => {
  const originalConfirm = window.confirm;
  const originalAlert = window.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    useAuth.mockReturnValue({
      user: { _id: 'student-1' }
    });
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    window.alert = originalAlert;
  });

  const renderPage = () => render(
    <MemoryRouter>
      <AvailableCoursesPage />
    </MemoryRouter>
  );

  it('lista cursos disponibles y permite matricularse', async () => {
    client.get
      .mockResolvedValueOnce({
        data: {
          courses: [
            { id: 'course-1', title: 'Curso de evidencias', description: 'Aprende a argumentar', owner: 'Prof. Díaz' }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: { courses: [] } // recarga tras matricularse
      });

    client.post.mockResolvedValueOnce({});

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Curso de evidencias')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /matricularme/i }));

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/enrollments', {
        studentId: 'student-1',
        courseId: 'course-1'
      });
    });
  });

  it('muestra mensaje de error si la carga falla', async () => {
    client.get.mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar los cursos/i)).toBeInTheDocument();
    });
  });
});
