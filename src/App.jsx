import './App.css'
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


import LandingPage from './pages/LandingPage';
import Admin from './pages/Admin';
import Login from './pages/Login'; // <--- Import Login
import Navbar from './components/Navbar'; // <--- Import Navbar


function App() {

  // AUTH SECTION
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });

  // CAROUSEL SECTION
  // 1. Initial Data for Carousel
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

  // 2. State for Carousel (with Local Storage)
  const [carouselSlides, setCarouselSlides] = useState(() => {
    const savedSlides = localStorage.getItem("carouselData");
    return savedSlides ? JSON.parse(savedSlides) : defaultSlides;
  });

  // 3. Save to Local Storage whenever slides change
  useEffect(() => {
    localStorage.setItem("carouselData", JSON.stringify(carouselSlides));
  }, [carouselSlides]);

  // END OF CAROUSEL

  // CARDS SECTION
  // 1. INITIAL DATA (Used if nothing is in Local Storage yet)
  const defaultSchemes = [
    {
      id: 1,
      title: "Pradhan Mantri Awas Yojana (Gramin)",
      category: "Housing",
      description: "Aiming to provide pucca houses with basic amenities.",
      image: "https://pmayg.nic.in/netiay/images/Slide1.jpg",
      visitUrl: "https://pmayg.nic.in/",
      downloadUrl: "https://pmayg.nic.in/netiay/document/Guideline_English.pdf",
      active: true
    },
    // ... add your other initial data here if you want
  ];

  // 2. STATE WITH LOCAL STORAGE
  // This looks in browser memory first. If empty, it uses 'defaultSchemes'
  const [schemes, setSchemes] = useState(() => {
    const savedSchemes = localStorage.getItem("schemesData");
    return savedSchemes ? JSON.parse(savedSchemes) : defaultSchemes;
  });

  // 3. SAVE TO LOCAL STORAGE
  // Anytime 'schemes' changes (add/edit/delete), save it automatically
  useEffect(() => {
    localStorage.setItem("schemesData", JSON.stringify(schemes));
  }, [schemes]);
  // END OF CARDS

  // This is a wrapper. If not logged in, it redirects to /login
  const ProtectedRoute = ({ children, secretLoginUrl }) => {
    if (!isLoggedIn) {
      // Redirect to the SECRET url, not just /login
      return <Navigate to={secretLoginUrl} replace />;
    }
    return children;
  };


  // 1. --- NEW: CATEGORIES STATE ---
  const defaultCategories = ["Housing", "Employment", "Technology", "Health", "Agriculture"];

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("categoriesData");
    return saved ? JSON.parse(saved) : defaultCategories;
  });

  // Save to local storage whenever categories change
  useEffect(() => {
    localStorage.setItem("categoriesData", JSON.stringify(categories));
  }, [categories]);


  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <Routes>

        <Route path="/" element={<LandingPage schemes={schemes} carouselSlides={carouselSlides} />} />

        {/* LOGIN ROUTE */}
        <Route path="/csc-secret-access" element={<Login setIsLoggedIn={setIsLoggedIn} />} />

        {/* 2. PROTECTED ADMIN ROUTE */}
        <Route
          path="/admin"
          element={
            // Update the redirect inside ProtectedRoute to point to your new secret URL
            <ProtectedRoute secretLoginUrl="/csc-secret-access">
              <Admin
                schemes={schemes}
                setSchemes={setSchemes}
                carouselSlides={carouselSlides}
                setCarouselSlides={setCarouselSlides}
                categories={categories}
                setCategories={setCategories}
              />
            </ProtectedRoute>
          }
        />

      </Routes>
    </Router>
  )
}

export default App
