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

// --- COMPONENTS ---
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute'; // <--- 1. IMPORT THE NEW GUARD

function App() {

  // AUTH SECTION (For Admin Panel)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });

  // --- CAROUSEL SECTION ---
  const [carouselSlides, setCarouselSlides] = useState([]);
  const fetchSlides = async () => {
    const { data, error } = await supabase.from('slides').select('*');
    if (error) console.log('Error fetching slides:', error);
    else setCarouselSlides(data);
  };

  // --- SCHEMES SECTION ---
  const [schemes, setSchemes] = useState([]);
  const fetchSchemes = async () => {
    const { data, error } = await supabase.from('schemes').select('*');
    if (error) console.log('Error fetching schemes:', error);
    else setSchemes(data);
  };

  // --- CATEGORIES SECTION ---
  const [categories, setCategories] = useState([]);
  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
      console.log('Error fetching categories:', error);
    } else {
      const categoryNames = data.map(item => item.name);
      setCategories(categoryNames);
    }
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchSchemes();
    fetchSlides();
    fetchCategories();
  }, []);

  // --- 2. RENAMED OLD WRAPPER TO "AdminPrivateRoute" ---
  // (This prevents naming conflict with the new ProtectedRoute)
  const AdminPrivateRoute = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(null);

    useEffect(() => {
      const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setIsAdmin(false);
          return;
        }

        // Check if this user is an admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setIsAdmin(profile?.role === 'admin');
      };

      checkAdmin();
    }, []);

    if (isAdmin === null) return <div>Loading...</div>; // Show spinner while checking
    if (isAdmin === false) return <Navigate to="/login" replace />; // Kick them out

    return children;
  };

  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route
          path="/"
          element={
            <LandingPage
              schemes={schemes.filter(item => item.type === 'scheme' || !item.type)}
              carouselSlides={carouselSlides}
            />
          }
        />

        <Route
          path="/forms"
          element={
            <FormsPage
              schemes={schemes.filter(item => item.type === 'form')}
              categories={categories}
            />
          }
        />

        <Route path="/csc-secret-access" element={<SLogin setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* --- ADMIN ROUTE (Uses Local AdminPrivateRoute) --- */}
        <Route
          path="/admin"
          element={
            <AdminPrivateRoute>
              <Admin
                schemes={schemes}
                setSchemes={setSchemes}
                carouselSlides={carouselSlides}
                setCarouselSlides={setCarouselSlides}
                categories={categories}
                setCategories={setCategories}
                refreshSchemes={fetchSchemes}
                refreshSlides={fetchSlides}
                refreshCategories={fetchCategories}
              />
            </AdminPrivateRoute>
          }
        />

        <Route path="/posters" element={<Posters />} />

        {/* --- 3. JOB ROUTES (Uses New Supabase ProtectedRoute) --- */}

        {/* Only "Seekers" can see this */}
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
              <ViewProfile /> {/* <--- New Component */}
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute allowedRole="seeker">
              <EditProfile /> {/* <--- Existing Component */}
            </ProtectedRoute>
          }
        />

        {/* Only "Providers" can see this */}
        <Route
          path="/post-job"
          element={
            <ProtectedRoute allowedRole="provider">
              <PostJob />
            </ProtectedRoute>
          }
        />

        <Route path="/my-jobs" element={<MyPostedJobs />} />
        <Route path="/edit-job/:id" element={<EditJob />} />
        <Route path="/provider-profile" element={<ProviderProfile />} />

        <Route
          path="/find-talent"
          element={
            <ProtectedRoute allowedRole="provider">
              <FindCandidates />
            </ProtectedRoute>
          }
        />

      </Routes>
    </Router>
  )
}

export default App;