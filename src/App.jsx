import './App.css'
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // <--- IMPORT SUPABASE HERE

import LandingPage from './pages/LandingPage';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Navbar from './components/Navbar';

function App() {

  // AUTH SECTION
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });

  // --- CAROUSEL SECTION (NOW CONNECTED TO SUPABASE) ---
  const [carouselSlides, setCarouselSlides] = useState([]);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from('slides')
      .select('*');

    if (error) {
      console.log('Error fetching slides:', error);
    } else {
      setCarouselSlides(data);
    }
  };
  // --- END CAROUSEL ---


  // --- SCHEMES SECTION (UPDATED TO SUPABASE) ---
  
  // 1. Start with an empty list
  const [schemes, setSchemes] = useState([]); 

  // 2. Fetch from Database when App loads
  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    const { data, error } = await supabase
      .from('schemes')
      .select('*');
    
    if (error) {
      console.log('Error fetching schemes:', error);
    } else {
      setSchemes(data); // <--- This updates the screen with REAL Cloud data
    }
  };
  // --- END SCHEMES ---


  // PROTECTED ROUTE WRAPPER
  const ProtectedRoute = ({ children, secretLoginUrl }) => {
    if (!isLoggedIn) {
      return <Navigate to={secretLoginUrl} replace />;
    }
    return children;
  };

  // CATEGORIES (Kept Local for now)
  const defaultCategories = ["Housing", "Employment", "Technology", "Health", "Agriculture"];
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("categoriesData");
    return saved ? JSON.parse(saved) : defaultCategories;
  });

  useEffect(() => {
    localStorage.setItem("categoriesData", JSON.stringify(categories));
  }, [categories]);


  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <Routes>
        <Route path="/" element={<LandingPage schemes={schemes} carouselSlides={carouselSlides} />} />
        
        <Route path="/csc-secret-access" element={<Login setIsLoggedIn={setIsLoggedIn} />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute secretLoginUrl="/csc-secret-access">
              <Admin
                schemes={schemes}
                setSchemes={setSchemes} // Admin will need to update this list after adding
                carouselSlides={carouselSlides}
                setCarouselSlides={setCarouselSlides}
                categories={categories}
                setCategories={setCategories}
                refreshSchemes={fetchSchemes} // <--- Pass this function so Admin can refresh the list
                refreshSlides={fetchSlides}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App