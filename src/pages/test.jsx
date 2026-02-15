import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // 1. Import Supabase
import GoogleTranslate from './GoogleTranslate';
import SmartText from './SmartText';

function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("none"); // 'seeker', 'provider', or null
  const [supabaseSession, setSupabaseSession] = useState(null);

  // --- 2. CHECK SUPABASE SESSION ON LOAD ---
  useEffect(() => {
    const checkUser = async () => {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseSession(session);

      if (session) {
        // If logged in, fetch their role from 'profiles' table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile) setUserRole(profile.role);
      }
    };

    checkUser();

    // Listen for login/logout changes automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      if (!session) setUserRole(null);
      else checkUser(); // Re-fetch role on login
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 3. UNIFIED LOGOUT FUNCTION ---
  const handleLogout = async () => {
    // A. Admin Logout (Local)
    if (isLoggedIn) {
      setIsLoggedIn(false);
      localStorage.removeItem('isAdminLoggedIn');
    }

    // B. Supabase Logout (Cloud)
    if (supabaseSession) {
      await supabase.auth.signOut();
      setSupabaseSession(null);
      setUserRole(null);
    }

    navigate('/'); // Redirect to Home
  };

  return (
    <nav className="bg-blue-600 border-b border-gray-200 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 ">

          {/* --- BRANDING --- */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-blue-600 p-5 md:hidden w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md group-hover:bg-blue-500 transition-colors">
              CSC
            </div>
            <div className="font-bold tracking-tight">
              <span className="hidden md:block text-xl p-2 notranslate">
                <span className='text-amber-500'>CSC-</span>
                <span className='text-white'>Empower</span>
                <span className='text-green-500'>-Hub</span>
              </span>
              <div className="z-50 md:hidden">
                 <GoogleTranslate />
              </div>
            </div>
          </Link>

          {/* --- LINKS --- */}
          <div className="flex items-center space-x-6 md:space-x-8">
            
            {/* 1. Common Links */}
            <Link to="/" className="text-white text-lg hover:text-gray-200 font-medium transition-colors hidden md:block">
              <SmartText ml="ഹോം">Home</SmartText>
            </Link>
            
            <Link to="/forms" className="text-white text-lg hover:text-gray-200 transition-colors hidden md:block">
              Forms
            </Link>

            {/* 2. JOB PROVIDER LINKS */}
            {userRole === 'provider' && (
              <>
                  <Link to="/find-talent" className="text-white hover:text-gray-200 ml-4">Find Talent</Link>
                  <Link to="/post-job" className="bg-white text-blue-600 px-3 py-1 rounded-md font-bold hover:bg-gray-100 transition">
                    + Post Job
                  </Link>
              </>

              
            )}

            {/* 3. JOB SEEKER LINKS */}
            {(userRole === 'seeker') && (
              <>
                  <Link to="/job-search" className="text-white text-lg hover:text-gray-200 transition-colors">
                    <SmartText ml="തൊഴിലുകൾ">Job Search</SmartText>
                  </Link>
                  <Link to="/profile" className="text-white hover:text-gray-200 ml-4">My Profile</Link>
              </>
            )}

            {/* 4. ADMIN LINK (Legacy) */}
            {isLoggedIn && (
              <Link to="/admin" className="text-yellow-300 hover:text-yellow-100 font-medium transition-colors">
                Admin Dashboard
              </Link>
            )}

            <div className="hidden md:block">
              <GoogleTranslate />
            </div>

            {/* 5. AUTH BUTTONS (Login / Logout) */}
            {(isLoggedIn || supabaseSession) ? (
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors text-sm"
              >
                Logout
              </button>
            ) : (
              <Link 
                to="/login"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors text-sm"
              >
                Login
              </Link>
            )}

          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;