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

  // --- CAROUSEL SECTION (Kept as Local Storage for now) ---
  const defaultSlides = [
    {
      id: 1,
      image: "https://ascentgroupindia.com/wp-content/uploads/2021/08/25-Government-Schemes-that-are-Transforming-the-Lives-of-Rural-India.jpeg",
      title: "Digital Growth",
      description: "Empowering rural India through technology."
    },
    {
      id: 2,
      image: "https://img.khetivyapar.com/images/news/1713762716-these-government-schemes-for-farmers-in-madhya-pradesh-madhya-pradesh-scheme-2024.jpg",
      title: "Tech Support",
      description: "24/7 Assistance for all government services."
    }
  ];

  const [carouselSlides, setCarouselSlides] = useState(() => {
    const savedSlides = localStorage.getItem("carouselData");
    return savedSlides ? JSON.parse(savedSlides) : defaultSlides;
  });

  useEffect(() => {
    localStorage.setItem("carouselData", JSON.stringify(carouselSlides));
  }, [carouselSlides]);
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
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App