import '@testing-library/jest-dom';

beforeAll(() => {
  process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:4000/api';
});
