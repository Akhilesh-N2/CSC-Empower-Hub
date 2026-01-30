import './App.css'
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

import LandingPage from './pages/LandingPage';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import FormsPage from './pages/FormsPage'; 

function App() {

  // AUTH SECTION
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

  // --- CATEGORIES SECTION (NEW: CONNECTED TO SUPABASE) ---
  const [categories, setCategories] = useState([]);

  const fetchCategories = async () => {
    // 1. Fetch from Supabase 'categories' table
    const { data, error } = await supabase.from('categories').select('*');
    
    if (error) {
      console.log('Error fetching categories:', error);
    } else {
      // 2. Extract just the names (e.g., "Health", "Housing")
      const categoryNames = data.map(item => item.name);
      setCategories(categoryNames);
    }
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchSchemes();
    fetchSlides();
    fetchCategories(); // <--- Load categories from cloud on startup
  }, []);


  // PROTECTED ROUTE WRAPPER
  const ProtectedRoute = ({ children, secretLoginUrl }) => {
    if (!isLoggedIn) {
      return <Navigate to={secretLoginUrl} replace />;
    }
    return children;
  };

  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <Routes>

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

        <Route path="/csc-secret-access" element={<Login setIsLoggedIn={setIsLoggedIn} />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute secretLoginUrl="/csc-secret-access">
              <Admin
                schemes={schemes}
                setSchemes={setSchemes}
                carouselSlides={carouselSlides}
                setCarouselSlides={setCarouselSlides}
                categories={categories}
                setCategories={setCategories}
                
                // PASS REFRESH FUNCTIONS
                refreshSchemes={fetchSchemes} 
                refreshSlides={fetchSlides}
                refreshCategories={fetchCategories} // <--- New prop for Admin
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App;