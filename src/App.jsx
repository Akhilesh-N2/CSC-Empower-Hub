import "./App.css";
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// --- PAGES ---
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

// --- COMPONENTS ---
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";
import { Settings } from "lucide-react";

function App() {
  // Local state for the "Secret" Admin login (SLogin)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isAdminLoggedIn") === "true";
  });

  // --- GLOBAL MAINTENANCE TOGGLE ---
  // Change to false tomorrow after the midnight reset!
  const isMaintenanceMode = true;

  const MaintenanceScreen = () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="bg-amber-50 p-6 rounded-full mb-6 border border-amber-100 shadow-inner">
        <Settings size={48} className="text-amber-600 animate-spin-slow" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
        Maintenance Shutdown
      </h1>
      <p className="text-slate-600 max-w-md leading-relaxed mb-8">
        We are currently upgrading our database and media storage to provide a
        faster experience for our community. All services will resume shortly
        after our scheduled midnight reset.
      </p>
      <div className="flex flex-col items-center gap-2">
        <div className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
          Status: Optimizing Quota
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        {/* Navbar handles its own Supabase session internally for efficiency */}
        <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

        <main className="flex-grow">
          {isMaintenanceMode ? (
            <MaintenanceScreen />
          ) : (
            <Routes>
              {/* PUBLIC ROUTES */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/forms" element={<FormsPage />} />
              <Route path="/posters" element={<Posters />} />
              <Route path="/terms" element={<Terms />} />

              {/* AUTH ROUTES */}
              <Route
                path="/csc-secret-access"
                element={<SLogin setIsLoggedIn={setIsLoggedIn} />}
              />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* --- ADMIN DASHBOARD --- */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <Admin />
                  </ProtectedRoute>
                }
              />

              {/* --- SEEKER ROUTES (Job Seekers) --- */}
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
              {/* These are now properly protected so Seekers can't access them */}
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
              <Route
                path="/my-jobs"
                element={
                  <ProtectedRoute allowedRole="provider">
                    <MyPostedJobs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-job/:id"
                element={
                  <ProtectedRoute allowedRole="provider">
                    <EditJob />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider-profile"
                element={
                  <ProtectedRoute allowedRole="provider">
                    <ProviderProfile />
                  </ProtectedRoute>
                }
              />
            </Routes>
          )}
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
