import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export const useTrafficTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const logVisit = async () => {
      try {
        // 1. Check if anyone is logged in
        const { data: { user } } = await supabase.auth.getUser();

        // 2. ✨ THE ADMIN BLOCKER: Replace this with your actual admin email!
        if (user && user.email === 'YOUR_ADMIN_EMAIL@gmail.com') {
          console.log("Admin detected: Visit not logged.");
          return; 
        }

        // 3. If it's a normal user or a guest, log the visit to Supabase
        await supabase.from('traffic_logs').insert([{
          path: location.pathname,
          user_id: user ? user.id : null, // Records ID if logged in, null if guest
          // Supabase will automatically set the 'created_at' timestamp!
        }]);

      } catch (error) {
        console.error("Traffic tracker error:", error);
      }
    };

    logVisit();
  }, [location.pathname]); // This runs every time the page URL changes
};