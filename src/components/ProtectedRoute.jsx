import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ children, allowedRole }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        // 2. Fetch specific Role (Precise Select!)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle(); // Use maybeSingle to prevent PGRST116 errors

        if (error || !profile) {
          console.error("Auth Guard Error:", error);
          setIsAuthorized(false);
        } else {
          // 3. Optimized Authorization Logic
          // Supports single string: "admin" OR array: ["admin", "provider"]
          if (allowedRole) {
            const roles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
            setIsAuthorized(roles.includes(profile.role));
          } else {
            setIsAuthorized(true); // Logged in but no role restriction
          }
        }
      } catch (err) {
        console.error("Unexpected ProtectedRoute error:", err);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [allowedRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-500 font-medium italic">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authorized, kick them to Login
  // We use replace so they can't go "back" into a protected route
  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;