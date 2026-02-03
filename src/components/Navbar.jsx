import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleTranslate from './GoogleTranslate';
import SmartText from './SmartText';


function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAdminLoggedIn');
    navigate('/'); // Go back to home after logout
  };

  return (
    <nav className="bg-blue-600 border-b border-gray-200 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 ">

          {/* --- BRANDING SECTION --- */}
          <Link to="/" className="flex items-center gap-3 group">

            {/* Logo Icon */}
            <div className="bg-blue-600 p-5 md:hidden w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md group-hover:bg-blue-500 transition-colors">
              CSC
            </div>

            <div className="font-bold tracking-tight">
              {/* MOBILE VIEW: Shows 'CSC-E-Hub' */}
              {/* <span className="block md:hidden text-lg">
                CSC-E-HUB
              </span> */}


              {/* DESKTOP VIEW: Shows 'CSC-Empower-Hub' */}
              <span className="hidden md:block text-xl p-2 notranslate">
                <span className='text-amber-500'>CSC-</span>
                <span className='text-white'>Empower</span>
                <span className='text-green-500'>-Hub</span>

              </span>
              <div className="z-50">
                <GoogleTranslate />
              </div>
            </div>
          </Link>

          {/* LINKS */}
          <div className="flex items-center space-x-12">
            <Link to="/" className="text-white text-lg hover:text-gray-900 font-medium transition-colors">
              <SmartText ml="ഹോം">
                Home
              </SmartText>
            </Link>
            <Link to="/forms" className="text-white text-lg hover:text-gray-900 transition-colors">
              Forms
            </Link>
            <div className=" md:block">
              <GoogleTranslate />
            </div>

            {isLoggedIn && (
              <>
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;