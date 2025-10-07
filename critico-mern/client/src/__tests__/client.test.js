import client from '../api/client.js';

describe('API client configuration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('usa la URL base de Vite por defecto', () => {
    expect(client.defaults.baseURL).toBe('http://localhost:4000/api');
  });

  it('inyecta encabezado Authorization cuando existe token', () => {
    localStorage.setItem('auth_token', 'jwt-token');
    const handler = client.interceptors.request.handlers[0].fulfilled;
    const config = handler({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('no modifica encabezados cuando no hay token', () => {
    const handler = client.interceptors.request.handlers[0].fulfilled;
    const config = handler({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});
