import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('seeker'); 

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // --- 1. SIGN UP LOGIC ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ 
              id: authData.user.id, 
              email: email,
              role: role,
              is_approved: false // <--- Explicitly set to false
            }]);

          if (profileError) throw profileError;

          // ALERT USER
          alert("Account created! Please wait for Admin Approval before logging in.");
          setIsSignUp(false); 
        }

      } else {
        // --- 2. LOGIN LOGIC ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // CHECK APPROVAL STATUS
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_approved') // <--- Fetch status
          .eq('id', data.user.id)
          .single();

        if (!profile?.is_approved) {
            // BLOCK THEM
            await supabase.auth.signOut(); // Force logout immediately
            alert("Your account is still pending Admin Approval. Please contact the CSC Center.");
            return;
        }

        // If approved, proceed
        if (profile.role === 'admin') {
            navigate('/admin'); // <--- Sends Admin to Dashboard
        } else if (profile.role === 'provider') {
            navigate('/find-talent');
        } else {
            navigate('/job-search');
        }
      }

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... (Your existing JSX remains exactly the same) ...
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        {/* ... form code ... */}
        {/* Just make sure the button and inputs are wrapped in the form tag that calls handleAuth */}
         <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-gray-500 mt-2">
            {isSignUp ? "Join us to find or post jobs." : "Login to access your dashboard."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Role Selection (Only show during Sign Up) */}
          {isSignUp && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="block text-sm font-bold text-blue-800 mb-2">I am a:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="seeker" 
                    checked={role === 'seeker'} 
                    onChange={(e) => setRole(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Job Seeker</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="provider" 
                    checked={role === 'provider'} 
                    onChange={(e) => setRole(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Job Provider</span>
                </label>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-md transition-all
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center text-sm text-gray-600">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 font-bold text-blue-600 hover:underline"
          >
            {isSignUp ? "Login here" : "Sign up here"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;