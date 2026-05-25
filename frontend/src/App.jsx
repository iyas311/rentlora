import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { useAuth } from "./hooks/useAuth";
import AddProperty from "./pages/AddProperty";
import BookingConfirm from "./pages/BookingConfirm";
import Browse from "./pages/Browse";
import Home from "./pages/Home";
import HostDashboard from "./pages/HostDashboard";
import Login from "./pages/Login";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import PropertyDetail from "./pages/PropertyDetail";
import Register from "./pages/Register";

function Protected({ children, role }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/bookings" element={<Protected><MyBookings /></Protected>} />
        <Route path="/bookings/confirm/:id" element={<Protected><BookingConfirm /></Protected>} />
        <Route path="/host/dashboard" element={<Protected role="host"><HostDashboard /></Protected>} />
        <Route path="/host/add-property" element={<Protected role="host"><AddProperty /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
      </Routes>
    </Layout>
  );
}
