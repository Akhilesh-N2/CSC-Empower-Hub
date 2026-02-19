import './App.css'
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// --- PAGES ---
import LandingPage from './pages/LandingPage';
import Admin from './pages/Admin';
import SLogin from './pages/SLogin';
import FormsPage from './pages/FormsPage';
import JobSearch from './pages/JobSearch';
import PostJob from './pages/PostJob';
import Login from './pages/Login';
import EditProfile from './pages/EditProfile';
import FindCandidates from './pages/FindCandidates';
import ViewProfile from './pages/ViewProfile';
import Signup from './pages/Signup';
import ProviderProfile from './pages/ProviderProfile';
import MyPostedJobs from './pages/MyPostedJobs';
import EditJob from './pages/EditJob';
import Posters from './pages/Posters';
import Terms from './pages/Term'; // Ensure filename matches (Term vs Terms)

// --- COMPONENTS ---
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';

function App() {

  // AUTH STATE (For the specific Admin Panel Login)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });

  // --- ADMIN ROUTE GUARD ---
  // Checks if the active Supabase user has the 'admin' role
  const AdminPrivateRoute = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(null);

    useEffect(() => {
      const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setIsAdmin(false);
          return;
        }

        // Check if this user is an admin in the profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setIsAdmin(profile?.role === 'admin');
      };

      checkAdmin();
    }, []);

    if (isAdmin === null) return <div className="p-10 text-center">Verifying Admin Access...</div>;
    if (isAdmin === false) return <Navigate to="/login" replace />;

    return children;
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

        <div className="flex-grow">
          <Routes>

            {/* PUBLIC ROUTES */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/forms" element={<FormsPage />} />
            <Route path="/posters" element={<Posters />} />
            <Route path="/terms" element={<Terms />} />

            {/* AUTH ROUTES */}
            <Route path="/csc-secret-access" element={<SLogin setIsLoggedIn={setIsLoggedIn} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* --- ADMIN DASHBOARD --- */}
            <Route
              path="/admin"
              element={
                <AdminPrivateRoute>
                  <Admin />
                </AdminPrivateRoute>
              }
            />

            {/* --- SEEKER ROUTES (Candidates) --- */}
            <Route
              path="/job-search"
              element={
                <ProtectedRoute allowedRole="seeker">
                  <JobSearch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRole="seeker">
                  <ViewProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute allowedRole="seeker">
                  <EditProfile />
                </ProtectedRoute>
              }
            />

            {/* --- PROVIDER ROUTES (Employers) --- */}
            <Route
              path="/post-job"
              element={
                <ProtectedRoute allowedRole="provider">
                  <PostJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/find-talent"
              element={
                <ProtectedRoute allowedRole="provider">
                  <FindCandidates />
                </ProtectedRoute>
              }
            />

            {/* SHARED / UTILITY ROUTES */}
            <Route path="/my-jobs" element={<MyPostedJobs />} />
            <Route path="/edit-job/:id" element={<EditJob />} />
            <Route path="/provider-profile" element={<ProviderProfile />} />

          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  )
}

export default App;