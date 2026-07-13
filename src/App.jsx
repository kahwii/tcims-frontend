import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './components/AdminDashboard';
import TouristSpots from './components/TouristSpots';
import Events from './components/Events';
import HeritageSites from './components/HeritageSites';
import Restaurants from './components/Restaurants';
import Hotels from './components/Hotels';
import TourismBusinesses from './components/TourismBusinesses';
import SentimentAnalysis from './components/SentimentAnalysis';
import ReportsAnalytics from './components/ReportsAnalytics';
import UserManagement from './components/UserManagement';
import RewardsAdmin from './components/RewardsAdmin';
import Certificates from './components/Certificates';
import TouristRoute from './components/TouristRoute';
import TouristLayout from './components/TouristLayout';
import TouristExplore from './components/TouristExplore';
import TouristTrail from './components/TouristTrail';
import TouristEvents from './components/TouristEvents';
import TouristFeedback from './components/TouristFeedback';
import EstablishmentRoute from './components/EstablishmentRoute';
import EstablishmentLayout from './components/EstablishmentLayout';
import EstablishmentDashboard from './components/EstablishmentDashboard';
import ComingSoon from './components/ComingSoon';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* ===== TOURIST AREA (Be@Mandaluyong) ===== */}
          <Route
            path="/tourist"
            element={
              <TouristRoute>
                <TouristLayout />
              </TouristRoute>
            }
          >
            <Route index element={<TouristExplore />} />
            <Route path="trail" element={<TouristTrail />} />
            <Route path="events" element={<TouristEvents />} />
            <Route path="feedback" element={<TouristFeedback />} />
          </Route>

          {/* ===== ESTABLISHMENT AREA (accreditation portal) ===== */}
          <Route
            path="/establishment"
            element={
              <EstablishmentRoute>
                <EstablishmentLayout />
              </EstablishmentRoute>
            }
          >
            <Route index element={<EstablishmentDashboard />} />
          </Route>

          {/* ===== ADMIN AREA (shared sidebar layout) ===== */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="tourist-spots" element={<TouristSpots />} />
            <Route path="restaurants" element={<Restaurants />} />
            <Route path="hotels" element={<Hotels />} />
            <Route path="tourism-businesses" element={<TourismBusinesses />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="events" element={<Events />} />
            <Route path="heritage-sites" element={<HeritageSites />} />
            <Route path="sentiment" element={<SentimentAnalysis />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            <Route path="rewards" element={<RewardsAdmin />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
