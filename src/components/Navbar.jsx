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
  const [hasNewPosters, setHasNewPosters] = useState(false); // ✨ NEW STATE

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

  // ✨ NEW: CHECK FOR NEW POSTERS ✨
  useEffect(() => {
    const checkForNewPosters = async () => {
      // Only check if user is logged in and is a shop
      if (role !== 'shop') return;

      try {
        // Get the date of the most recently added poster
        const { data, error } = await supabase
          .from('schemes')
          .select('created_at')
          .eq('active', true)
          .eq('category', 'Poster')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          const latestPosterDate = new Date(data.created_at).getTime();
          const lastViewedStr = localStorage.getItem('last_viewed_posters');
          const lastViewedDate = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;

          // If the latest poster is newer than the last viewed time, show the dot!
          if (latestPosterDate > lastViewedDate) {
            setHasNewPosters(true);
          }
        }
      } catch (error) {
        console.error('Error checking for new posters:', error);
      }
    };

    checkForNewPosters();

    // Listen for the custom event from Posters.jsx to hide the dot instantly
    const hideDot = () => setHasNewPosters(false);
    window.addEventListener('posters_viewed', hideDot);

    return () => {
      window.removeEventListener('posters_viewed', hideDot);
    };
  }, [role]); // Re-run when role is set

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setIsMenuOpen(false);
    navigate('/login');
  };

  const getHomePath = () => {
    if (role === 'admin') return '/admin';
    if (role === 'provider') return '/find-talent';
    if (role === 'seeker') return '/job-search';
    if (role === 'shop') return '/shop-dashboard'; 
    return '/';
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          <Link to={getHomePath()} className="text-2xl font-bold text-blue-400 flex items-center gap-2 notranslate">
            CSC<span className="text-white">Empower</span>Hub
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-blue-300 transition">
              <SmartText ml="ഹോം">Home</SmartText>
            </Link>
            <Link to="/forms" className="hover:text-blue-300 transition">Forms</Link>
            
            {/* ✨ POSTERS LINK WITH NOTIFICATION DOT ✨ */}
            <Link to="/posters" className="hover:text-blue-300 transition relative flex items-center">
              Posters
              {hasNewPosters && (
                <span className="absolute -top-1 -right-3 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </Link>

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

            {role === 'shop' && (
              <>
                <Link to="/shop-dashboard" className="hover:text-blue-300 transition">Billing System</Link>
              </>
            )}

            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition border-l border-slate-700 pl-4">
                <LogOut size={18} /> Logout
              </button>
            ) : (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
                <Link to="/login" className="text-gray-300 hover:text-white transition font-medium">
                  Login
                </Link>
                <Link to="/signup" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-bold transition shadow-md">
                  <UserPlus size={18} /> Join Now
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 relative">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              {/* Add a dot to the hamburger menu if closed and there are new posters */}
              {hasNewPosters && !isMenuOpen && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-slate-800 p-4 space-y-4 border-t border-slate-700">
          <Link to="/" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>
            <SmartText ml="ഹോം">Home</SmartText>
          </Link>
          <Link to="/forms" className="block py-2 text-gray-300" onClick={() => setIsMenuOpen(false)}>Forms</Link>
          
          {/* ✨ MOBILE POSTERS LINK WITH NOTIFICATION DOT ✨ */}
          <Link to="/posters" className="py-2 text-gray-300 flex items-center justify-between" onClick={() => setIsMenuOpen(false)}>
            Posters
            {hasNewPosters && (
              <span className="flex h-2.5 w-2.5 relative mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </Link>
          
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

          {role === 'shop' && (
            <>
              <Link to="/shop-dashboard" className="block py-2 text-gray-300 font-bold" onClick={() => setIsMenuOpen(false)}>Billing System</Link>
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