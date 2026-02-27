import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Menu, X, User, LogOut, LayoutDashboard, UserPlus } from 'lucide-react';
import SmartText from './SmartText';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchRole = async (userId) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        setRole(data?.role || null);
      } catch (err) {
        setRole(null);
      }
    };

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchRole(session.user.id);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (currentUser?.id !== user?.id) {
        setUser(currentUser);
        if (currentUser) fetchRole(currentUser.id);
        else setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setIsMenuOpen(false);
    navigate('/login');
  };

  // --- DYNAMIC LOGO REDIRECT ---
  const getHomePath = () => {
    if (role === 'admin') return '/admin';
    if (role === 'provider') return '/find-talent';
    if (role === 'seeker') return '/job-search';
    return '/';
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* --- INTELLIGENT LOGO --- */}
          <Link to={getHomePath()} className="text-2xl font-bold text-blue-400 flex items-center gap-2 notranslate">
            CSC<span className="text-white">Empower</span>Hub
          </Link>

          {/* --- DESKTOP MENU --- */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-blue-300 transition">
              <SmartText ml="ഹോം">Home</SmartText>
            </Link>
            <Link to="/forms" className="hover:text-blue-300 transition">Forms</Link>
            <Link to="/posters" className="hover:text-blue-300 transition">Posters</Link>

            {/* ROLE SPECIFIC LINKS */}
            {role === 'admin' && (
              <Link to="/admin" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
                <LayoutDashboard size={18} /> Admin Panel
              </Link>
            )}

            {role === 'seeker' && (
              <>
                <Link to="/job-search" className="hover:text-blue-300 transition">Find Jobs</Link>
                <Link to="/profile" className="hover:text-blue-300 transition">My Profile</Link>
              </>
            )}

            {role === 'provider' && (
              <>
                <Link to="/find-talent" className="hover:text-blue-300 transition">Find Candidates</Link>
                <Link to="/my-jobs" className="hover:text-blue-300 transition">My Jobs</Link>
                <Link to="/provider-profile" className="hover:text-blue-300 transition">Company Profile</Link>
              </>
            )}

            {/* --- AUTH SECTION --- */}
            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition border-l border-slate-700 pl-4">
                <LogOut size={18} /> Logout
              </button>
            ) : (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
                <Link to="/login" className="text-gray-300 hover:text-white transition font-medium">
                  Login
                </Link>
                {/* --- JOIN NOW BUTTON --- */}
                <Link to="/signup" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-bold transition shadow-md">
                  <UserPlus size={18} /> Join Now
                </Link>
              </div>
            )}
          </div>

          {/* --- MOBILE HAMBURGER --- */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- MOBILE MENU --- */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-800 p-4 space-y-4 border-t border-slate-700">
          <Link to="/" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>
            <SmartText ml="ഹോം">Home</SmartText>
          </Link>
          <Link to="/forms" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>Forms</Link>
          <Link to="/posters" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>Posters</Link>
          
          {/* NEW: ADMIN PANEL FOR MOBILE */}
          {role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-2 py-3 px-4 mt-2 bg-red-600 text-white rounded-lg font-bold" onClick={() => setIsMenuOpen(false)}>
              <LayoutDashboard size={18} /> Admin Panel
            </Link>
          )}

          {role === 'seeker' && (
            <>
              <Link to="/job-search" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>Find Jobs</Link>
              <Link to="/profile" className="block py-2 text-blue-400 font-bold" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
            </>
          )}

          {role === 'provider' && (
            <>
              <Link to="/find-talent" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>Find Candidates</Link>
              <Link to="/my-jobs" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>My Jobs</Link>
              <Link to="/provider-profile" className="block py-2 text-blue-400 font-bold" onClick={() => setIsMenuOpen(false)}>Company Profile</Link>
            </>
          )}

          {user ? (
            <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left py-4 text-red-400 font-bold border-t border-slate-700 mt-2">
              <LogOut size={18} /> Logout
            </button>
          ) : (
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-700">
              <Link to="/login" className="text-center py-2 text-gray-300 font-bold" onClick={() => setIsMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-bold" onClick={() => setIsMenuOpen(false)}>
                <UserPlus size={18} /> Join Now
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;