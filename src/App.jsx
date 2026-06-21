import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import AppLayout from './layouts/AppLayout';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import DepartmentDetail from './pages/DepartmentDetail';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import Profile from './pages/Profile';
import Plan from './pages/Plan';
import Saved from './pages/Saved';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* /login & /register are kept as redirects so any saved links
                or back-button navigation still land somewhere useful. */}
            <Route path="/login"    element={<Navigate to="/dashboard" replace />} />
            <Route path="/register" element={<Navigate to="/dashboard" replace />} />

            {/* App shell with rail nav — everything is public now. */}
            <Route element={<AppLayout />}>
              <Route path="/courses"            element={<Courses />} />
              <Route path="/courses/:id"        element={<CourseDetail />} />
              <Route path="/departments/:slug"  element={<DepartmentDetail />} />
              <Route path="/community"          element={<Community />} />
              <Route path="/resources"          element={<Navigate to="/community" replace />} />
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/saved"              element={<Saved />} />
              <Route path="/timetable"          element={<Timetable />} />
              <Route path="/plan"               element={<Plan />} />
              <Route path="/schedule"           element={<Navigate to="/timetable" replace />} />
              <Route path="/profile"            element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
