import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentsManagementPage from '../pages/StudentsManagementPage.jsx';
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

describe('StudentsManagementPage', () => {
  const originalAlert = window.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    useAuth.mockReturnValue({
      user: { role: 'teacher' }
    });
  });

  afterEach(() => {
    window.alert = originalAlert;
  });

  const renderPage = () => render(
    <MemoryRouter>
      <StudentsManagementPage />
    </MemoryRouter>
  );

  it('muestra los cursos del docente', async () => {
    client.get.mockResolvedValueOnce({
      data: [
        { id: 'course-1', title: 'Curso 1', description: 'Descripción 1' }
      ]
    });

    renderPage();

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/courses/mine');
    });

    expect(screen.getByText('👥 Gestión de Estudiantes')).toBeInTheDocument();
    expect(screen.getByText('Curso 1')).toBeInTheDocument();
  });

  it('permite abrir el modal de estudiantes', async () => {
    client.get.mockResolvedValueOnce({
      data: [
        { id: 'course-1', title: 'Curso 1', description: 'Descripción 1' }
      ]
    });

    client.get.mockResolvedValueOnce({
      data: { students: [{ _id: 'student-1', firstName: 'Ana', lastName: 'López' }] }
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Curso 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /ver estudiantes/i }));

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/courses/course-1/students');
    });
  });

  it('muestra mensaje de error cuando falla la carga', async () => {
    client.get.mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar cursos/i)).toBeInTheDocument();
    });
  });
});
