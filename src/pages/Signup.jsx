import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Signup State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('seeker'); // Default to Job Seeker

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Supabase Auth User
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // 2. Create Profile Entries (if user creation successful)
      if (data.user) {
        
        // A. Insert into the main Profiles table (for auth/routing logic)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: data.user.id, 
            email: email, 
            role: role, 
            is_approved: false // Pending Approval
          }]);

        if (profileError) {
          console.error("Error creating base profile:", profileError);
          // Note: If this fails, you might want to delete the auth user to prevent orphaned accounts, 
          // but for now, logging is safer than destructive actions on the client side.
        }

        // B. OPTIMIZATION: Initialize the specific sub-profile table to prevent bugs later
        if (role === 'seeker') {
          await supabase.from('seeker_profiles').insert([{ 
            id: data.user.id, 
            contact_email: email // Pre-fill the email
          }]);
        } else if (role === 'provider') {
          await supabase.from('provider_profiles').insert([{ 
            id: data.user.id 
          }]);
        }

        // 3. FORCE LOGOUT (Prevent auto-login since they need approval)
        await supabase.auth.signOut();

        // 4. Success Message & Redirect
        alert("Account created successfully! Please wait for Admin Approval before logging in.");
        navigate('/login');
      }

    } catch (error) {
      alert("Signup failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      {/* Added z-10 and relative to fix potential z-index issues with backgrounds */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 z-10 relative">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 mt-2">Join us to find or post jobs.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
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
              minLength="6" // Good practice to enforce minimum length
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Role Selection */}
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
                  className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-gray-700 font-medium">Job Seeker</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="provider" 
                  checked={role === 'provider'} 
                  onChange={(e) => setRole(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-gray-700 font-medium">Job Provider</span>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-md transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account? 
          <Link to="/login" className="ml-2 font-bold text-blue-600 hover:underline">
            Login here
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Signup;