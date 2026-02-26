import "./App.css";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

// --- PAGES & COMPONENTS ---
import LandingPage from "./pages/LandingPage";
import Admin from "./pages/Admin";
import SLogin from "./pages/SLogin";
import FormsPage from "./pages/FormsPage";
import JobSearch from "./pages/JobSearch";
import PostJob from "./pages/PostJob";
import Login from "./pages/Login";
import EditProfile from "./pages/EditProfile";
import FindCandidates from "./pages/FindCandidates";
import ViewProfile from "./pages/ViewProfile";
import Signup from "./pages/Signup";
import ProviderProfile from "./pages/ProviderProfile";
import MyPostedJobs from "./pages/MyPostedJobs";
import EditJob from "./pages/EditJob";
import Posters from "./pages/Posters";
import Terms from "./pages/Term";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";
import { Settings } from "lucide-react";

// --- HELPER: Scroll to top on route change ---
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isAdminLoggedIn") === "true";
  });
  
  const [currentUser, setCurrentUser] = useState(null);

  // Listen for Auth changes to identify Manoj
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isMaintenanceMode = false;
  const adminEmail = "manoj@gmail.com";

  const MaintenanceScreen = () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="bg-amber-50 p-6 rounded-full mb-6 border border-amber-100 shadow-inner">
        <Settings size={48} className="text-amber-600 animate-spin-slow" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Maintenance Shutdown</h1>
      <p className="text-slate-600 max-w-md mb-8">Upgrading for a faster experience. Back shortly!</p>
    </div>
  );

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

        <main className="flex-grow">
          {isMaintenanceMode ? (
            <MaintenanceScreen />
          ) : (
            <Routes>
              {/* PUBLIC */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/forms" element={<FormsPage />} />
              <Route path="/posters" element={<Posters />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* ADMIN: Double Protected via Email Check */}
              <Route
                path="/admin"
                element={
                  currentUser?.email === adminEmail ? (
                    <Admin />
                  ) : (
                    <div className="p-20 text-center font-bold">Access Denied: Admins Only</div>
                  )
                }
              />

              {/* SEEKER */}
              <Route path="/job-search" element={<ProtectedRoute allowedRole="seeker"><JobSearch /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute allowedRole="seeker"><ViewProfile /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute allowedRole="seeker"><EditProfile /></ProtectedRoute>} />

              {/* PROVIDER */}
              <Route path="/post-job" element={<ProtectedRoute allowedRole="provider"><PostJob /></ProtectedRoute>} />
              <Route path="/find-talent" element={<ProtectedRoute allowedRole="provider"><FindCandidates /></ProtectedRoute>} />
              <Route path="/my-jobs" element={<ProtectedRoute allowedRole="provider"><MyPostedJobs /></ProtectedRoute>} />
              <Route path="/edit-job/:id" element={<ProtectedRoute allowedRole="provider"><EditJob /></ProtectedRoute>} />
              <Route path="/provider-profile" element={<ProtectedRoute allowedRole="provider"><ProviderProfile /></ProtectedRoute>} />
            </Routes>
          )}
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;