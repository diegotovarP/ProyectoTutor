import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

jest.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: jest.fn()
}));

jest.mock('../components/StudentChatbot', () => () => <div data-testid="student-chatbot" />);

jest.mock('../pages/LoginPage.jsx', () => () => <div>Login Page</div>);
jest.mock('../pages/RegisterPage.jsx', () => () => <div>Register Page</div>);
jest.mock('../pages/DashboardPage.jsx', () => () => <div>Dashboard Page</div>);
jest.mock('../pages/CoursesPage.jsx', () => () => <div>Courses Page</div>);
jest.mock('../pages/CourseDetailPage.jsx', () => () => <div>Course Detail Page</div>);
jest.mock('../pages/TextsListPage.jsx', () => () => <div>Texts List Page</div>);
jest.mock('../pages/StudentsManagementPage.jsx', () => () => <div>Students Management Page</div>);
jest.mock('../pages/AvailableCoursesPage.jsx', () => () => <div>Available Courses Page</div>);
jest.mock('../pages/StudentEvaluationPage.jsx', () => () => <div>Student Evaluation Page</div>);

const mockLogout = jest.fn();
let authState;

const renderWithRoute = (route) => render(
  <MemoryRouter initialEntries={[route]}>
    <App />
  </MemoryRouter>
);

describe('App routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = {
      token: 'mock-token',
      user: {
        _id: 'user-123',
        firstName: 'Ana',
        lastName: 'García',
        role: 'teacher'
      },
      logout: mockLogout,
      isLoading: false,
      error: null
    };
    useAuth.mockImplementation(() => authState);
  });

  it('redirects root path to login', () => {
    renderWithRoute('/');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders login page at /login', () => {
    renderWithRoute('/login');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders register page at /register', () => {
    renderWithRoute('/register');
    expect(screen.getByText('Register Page')).toBeInTheDocument();
  });

  it('renders dashboard inside protected area when authenticated', () => {
    renderWithRoute('/app');
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders courses list route', () => {
    renderWithRoute('/app/courses');
    expect(screen.getByText('Courses Page')).toBeInTheDocument();
  });

  it('renders course detail route', () => {
    renderWithRoute('/app/courses/course-1');
    expect(screen.getByText('Course Detail Page')).toBeInTheDocument();
  });

  it('renders texts list route for topic', () => {
    renderWithRoute('/app/courses/course-1/topics/topic-5/texts');
    expect(screen.getByText('Texts List Page')).toBeInTheDocument();
  });

  it('renders students management route', () => {
    renderWithRoute('/app/students');
    expect(screen.getByText('Students Management Page')).toBeInTheDocument();
  });

  it('renders available courses route for students', () => {
    authState.user.role = 'student';
    renderWithRoute('/app/student/available-courses');
    expect(screen.getByText('Available Courses Page')).toBeInTheDocument();
  });

  it('renders student evaluation route', () => {
    authState.user.role = 'student';
    renderWithRoute('/app/student/evaluation');
    expect(screen.getByText('Student Evaluation Page')).toBeInTheDocument();
  });

  it('redirects unknown routes to login', () => {
    renderWithRoute('/unknown');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects protected routes to login when unauthenticated', () => {
    authState = {
      token: null,
      user: null,
      logout: mockLogout,
      isLoading: false,
      error: null
    };
    useAuth.mockImplementation(() => authState);

    renderWithRoute('/app');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
