import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ children, allowedRole }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return; // Not logged in
      }

      // 2. Check their specific Role (Seeker vs Provider)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // 3. Authorization Logic
      // If we provided an 'allowedRole', does it match?
      if (allowedRole && profile?.role !== allowedRole) {
        setIsAuthorized(false); // Wrong Role
      } else {
        setIsAuthorized(true); // Success!
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [allowedRole]);

  if (loading) {
    return <div className="p-10 text-center">Checking permissions...</div>;
  }

  // If not authorized, kick them to Login
  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  // If authorized, show the page
  return children;
};

export default ProtectedRoute;