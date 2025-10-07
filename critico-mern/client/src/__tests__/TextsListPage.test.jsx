import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TextsListPage from '../pages/TextsListPage.jsx';
import client from '../api/client';

jest.mock('../api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn()
}));

const renderWithRoute = (state) => render(
  <MemoryRouter initialEntries={[{ pathname: '/app/courses/course-1/topics/topic-1/texts', state }]}>
    <Routes>
      <Route path="/app/courses/:courseId/topics/:topicId/texts" element={<TextsListPage />} />
    </Routes>
  </MemoryRouter>
);

describe('TextsListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockApiForTexts = () => {
    client.get.mockImplementation((url) => {
      if (url === '/topics/course/course-1') {
        return Promise.resolve({
          data: [
            { id: 'topic-1', title: 'Pensamiento crítico', description: 'Analiza argumentos' }
          ]
        });
      }
      if (url === '/texts/topic/topic-1') {
        return Promise.resolve({
          data: [
            { id: 'text-1', title: 'Texto introductorio', difficulty: 'intermedio', content: '...' }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });
  };

  it('muestra los textos del tema seleccionado', async () => {
    mockApiForTexts();

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Textos de: Pensamiento crítico')).toBeInTheDocument();
    });

    expect(screen.getByText('Texto introductorio')).toBeInTheDocument();
  });

  it('muestra mensaje de error cuando falla la carga', async () => {
    client.get.mockRejectedValueOnce(new Error('Request failed'));

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar los textos/i)).toBeInTheDocument();
    });
  });
});
