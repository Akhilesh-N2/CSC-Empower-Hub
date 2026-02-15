import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react'; 
import GoogleTranslate from './GoogleTranslate';
import SmartText from './SmartText';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- AUTH LOGIC (Keep this new logic) ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchRole(session.user.id);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data) setRole(data.role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* --- LEFT SIDE: LOGO & MOBILE TRANSLATE --- */}
          <Link to="/" className="text-2xl font-bold text-blue-400 flex items-center gap-2 notranslate">
            CSC<span className="text-white">Empower</span>
            
            {/* Mobile Translate (Visible only on small screens) */}
            <div className="z-50 md:hidden ml-2">
               <GoogleTranslate />
            </div>
          </Link>

          {/* --- RIGHT SIDE: DESKTOP MENU --- */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-blue-300 transition">
              <SmartText ml="ഹോം">Home</SmartText>
            </Link>
            <Link to="/forms" className="hover:text-blue-300 transition">Forms</Link>

            {/* ROLE LINKS */}
            {role === 'admin' && (
              <Link to="/admin" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
                <LayoutDashboard size={18} /> Admin Panel
              </Link>
            )}

            {role === 'seeker' && (
              <>
                <Link to="/jobs" className="hover:text-blue-300 transition">Find Jobs</Link>
                <Link to="/profile" className="hover:text-blue-300 transition">My Profile</Link>
              </>
            )}

            {role === 'provider' && (
              <>
                <Link to="/find-talent" className="hover:text-blue-300 transition">Find Candidates</Link>
                <Link to="/post-job" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold transition">
                  + Post Job
                </Link>
              </>
            )}

            {/* Desktop Translate (Visible only on large screens) */}
            <div className="hidden md:block">
              <GoogleTranslate />
            </div>

            {/* LOGIN / LOGOUT BUTTONS */}
            {user ? (
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 text-gray-300 hover:text-white transition"
              >
                <LogOut size={18} /> Logout
              </button>
            ) : (
              <Link to="/login" className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition">
                <User size={18} /> Login
              </Link>
            )}
          </div>

          {/* --- MOBILE HAMBURGER BUTTON --- */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300 hover:text-white ml-4">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- MOBILE DROPDOWN MENU --- */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-800 p-4 space-y-4 border-t border-slate-700">
          <Link to="/" className="block text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Home</Link>
          <Link to="/forms" className="block text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Forms</Link>
          
          {role === 'admin' && (
            <Link to="/admin" className="block text-red-400 font-bold" onClick={() => setIsMenuOpen(false)}>Admin Panel</Link>
          )}

          {role === 'seeker' && (
            <>
              <Link to="/jobs" className="block text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Find Jobs</Link>
              <Link to="/profile" className="block text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
            </>
          )}

          {role === 'provider' && (
            <>
              <Link to="/find-talent" className="block text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Find Candidates</Link>
              <Link to="/post-job" className="block text-blue-400 font-bold" onClick={() => setIsMenuOpen(false)}>+ Post Job</Link>
            </>
          )}

          {user ? (
            <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block w-full text-left text-gray-400 hover:text-white">Logout</button>
          ) : (
            <Link to="/login" className="block w-full text-left font-bold text-white" onClick={() => setIsMenuOpen(false)}>Login</Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;