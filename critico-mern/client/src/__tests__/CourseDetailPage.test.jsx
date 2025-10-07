import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseDetailPage from '../pages/CourseDetailPage.jsx';
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

const renderWithRoute = () => render(
  <MemoryRouter initialEntries={['/app/courses/course-1']}>
    <Routes>
      <Route path="/app/courses/:courseId" element={<CourseDetailPage />} />
    </Routes>
  </MemoryRouter>
);

describe('CourseDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockApiForCourse = () => {
    client.get.mockImplementation((url) => {
      if (url === '/courses/course-1') {
        return Promise.resolve({
          data: { id: 'course-1', title: 'Curso Demo', description: 'Descripción del curso' }
        });
      }
      if (url === '/topics/course/course-1') {
        return Promise.resolve({
          data: [
            {
              id: 'topic-1',
              title: 'Tema introductorio',
              order: 1,
              objectives: ['inference'],
              releaseDate: '2025-01-01T00:00:00.000Z',
              dueDate: '2025-01-15T00:00:00.000Z'
            }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });
  };

  it('permite gestionar temas cuando el usuario puede administrar', async () => {
    useAuth.mockReturnValue({
      user: { role: 'teacher' }
    });

    mockApiForCourse();

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Curso Demo')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /agregar tema/i })).toBeInTheDocument();
    expect(screen.getByText('Tema introductorio')).toBeInTheDocument();
  });

  it('no muestra acciones administrativas para estudiantes', async () => {
    useAuth.mockReturnValue({
      user: { role: 'student' }
    });

    mockApiForCourse();

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Curso Demo')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /agregar tema/i })).not.toBeInTheDocument();
  });
});
