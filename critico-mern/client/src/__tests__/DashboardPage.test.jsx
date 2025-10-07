import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import client from '../api/client';

jest.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: jest.fn()
}));

jest.mock('../api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra progreso del estudiante cuando el usuario es estudiante', async () => {
    useAuth.mockReturnValue({
      user: {
        _id: 'student-1',
        firstName: 'Ana',
        role: 'student'
      }
    });

    client.get.mockResolvedValueOnce({
      data: {
        progress: [
          {
            courseId: 'course-1',
            courseTitle: 'Pensamiento crítico',
            completion: 85,
            completedTexts: 4,
            totalTexts: 6,
            answeredQuestions: 20
          }
        ]
      }
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/enrollments/student/student-1/progress');
    });

    expect(screen.getByText('Hola, Ana 👋')).toBeInTheDocument();
    expect(screen.getByText('Tu Progreso')).toBeInTheDocument();
    expect(screen.getAllByText('Pensamiento crítico')[0]).toBeInTheDocument();
  });

  it('muestra los cursos del docente cuando el usuario es teacher', async () => {
    useAuth.mockReturnValue({
      user: {
        firstName: 'Diego',
        role: 'teacher'
      }
    });

    client.get.mockResolvedValueOnce({
      data: [
        {
          id: 'course-1',
          title: 'Argumentación avanzada',
          description: 'Refuerza tus habilidades',
          progress: 60
        }
      ]
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/courses/mine');
    });

    expect(screen.getByText('Hola, Diego 👋')).toBeInTheDocument();
    expect(screen.getByText('Mis cursos')).toBeInTheDocument();
    expect(screen.getByText('Argumentación avanzada')).toBeInTheDocument();
  });
});
