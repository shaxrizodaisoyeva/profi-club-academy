import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CoursesManage from "./pages/CoursesManage";
import CourseEditor from "./pages/CourseEditor";
import ModuleEditor from "./pages/ModuleEditor";
import Users from "./pages/Users";
import Feedback from "./pages/Feedback";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex">
      <Sidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Layout><CoursesManage /></Layout></ProtectedRoute>} />
      <Route path="/courses/:id" element={<ProtectedRoute><Layout><CourseEditor /></Layout></ProtectedRoute>} />
      <Route path="/courses/:courseId/modules/:moduleId" element={<ProtectedRoute><Layout><ModuleEditor /></Layout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute><Layout><Feedback /></Layout></ProtectedRoute>} />
    </Routes>
  );
}
