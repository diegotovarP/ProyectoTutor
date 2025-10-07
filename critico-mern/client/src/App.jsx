import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CoursesPage from './pages/CoursesPage.jsx';
import CourseDetailPage from './pages/CourseDetailPage.jsx';
import TextsListPage from './pages/TextsListPage.jsx';
import AvailableCoursesPage from './pages/AvailableCoursesPage.jsx';
import StudentEvaluationPage from './pages/StudentEvaluationPage.jsx';
import StudentsManagementPage from './pages/StudentsManagementPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route path="/app" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />

        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="courses/:courseId/topics/:topicId/texts" element={<TextsListPage />} />
        <Route path="students" element={<StudentsManagementPage />} />

        <Route path="student/available-courses" element={<AvailableCoursesPage />} />
        <Route path="student/evaluation" element={<StudentEvaluationPage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;
