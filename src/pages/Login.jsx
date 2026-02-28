import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State to track empty required fields
  const [errors, setErrors] = useState({
    email: false,
    password: false
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Custom Validation: Check for empty fields before attempting to log in
    const newErrors = {
      email: !email.trim(),
      password: !password.trim()
    };

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return; // Stop the function here if there are errors
    }

    // Clear errors if fields are filled
    setErrors({ email: false, password: false });
    setLoading(true);

    try {
      // 1. Sign In
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Check Role & Approval
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', authData.user.id)
        .single();

      // OPTIMIZATION: Handle missing profiles gracefully
      if (profileError) {
        await supabase.auth.signOut();
        throw new Error("Your account profile is incomplete. Please contact support or try signing up again.");
      }

      // 3. Approval Check
      if (!profile?.is_approved) {
        await supabase.auth.signOut();
        alert("Access Denied: Your account is pending Admin approval.");
        return;
      }

      // 4. Redirect based on Role
      if (profile.role === 'admin') {
        navigate('/admin');
      } else if (profile.role === 'provider') {
        navigate('/find-talent');
      } else if (profile.role === 'shop') {
        navigate('/shop-dashboard'); 
      } else if (profile.role === 'seeker') {
        navigate('/job-search');
      } else {
        navigate('/'); // Fallback
      }

    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 z-10 relative">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Login to access your dashboard.</p>
        </div>

        {/* Added noValidate to stop default browser tooltips */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${
                errors.email 
                ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
              }`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Instantly remove the red border when the user starts typing
                if (errors.email) setErrors({ ...errors, email: false });
              }}
            />
            {/* Explicit Error Message */}
            {errors.email && (
              <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                ⚠️ Email is required
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${
                errors.password 
                ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
              }`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // Instantly remove the red border when the user starts typing
                if (errors.password) setErrors({ ...errors, password: false });
              }}
            />
            {/* Explicit Error Message */}
            {errors.password && (
              <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                ⚠️ Password is required
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-md transition-all mt-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account? 
          <Link to="/signup" className="ml-2 font-bold text-blue-600 hover:underline">
            Sign up here
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;