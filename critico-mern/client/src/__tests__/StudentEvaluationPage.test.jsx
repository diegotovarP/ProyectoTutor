import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentEvaluationPage from '../pages/StudentEvaluationPage.jsx';
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

jest.mock('../components/StudentChatbot', () => () => <div data-testid="student-chatbot" />);

describe('StudentEvaluationPage', () => {
  const originalConfirm = window.confirm;
  const originalAlert = window.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    useAuth.mockReturnValue({
      user: {
        _id: 'student-1',
        firstName: 'Ana',
        role: 'student'
      }
    });
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    window.alert = originalAlert;
  });

  const renderPage = () => render(
    <MemoryRouter>
      <StudentEvaluationPage />
    </MemoryRouter>
  );

  it('muestra cursos matriculados y progreso', async () => {
    client.get.mockResolvedValueOnce({
      data: {
        progress: [
          {
            courseId: 'course-1',
            courseTitle: 'Pensamiento crítico',
            courseDescription: 'Mejora tus habilidades',
            completion: 72,
            completedTexts: 5,
            totalTexts: 8,
            answeredQuestions: 18
          }
        ]
      }
    });

    renderPage();

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/enrollments/student/student-1/progress');
    });

    expect(screen.getByText('📊 Evaluación')).toBeInTheDocument();
    expect(screen.getByText('Pensamiento crítico')).toBeInTheDocument();
    expect(screen.getByText('5/8')).toBeInTheDocument();
  });

  it('muestra mensaje de error cuando la carga falla', async () => {
    client.get.mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar cursos/i)).toBeInTheDocument();
    });
  });
});
