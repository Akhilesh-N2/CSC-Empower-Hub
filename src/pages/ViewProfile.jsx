import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Briefcase, PenTool } from 'lucide-react';

function ViewProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('seeker_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading profile...</div>;

  // If no profile exists yet, force them to create one
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Profile Found</h2>
          <p className="text-gray-500 mb-6">You haven't set up your job profile yet. Create one to get discovered by employers.</p>
          <Link to="/profile/edit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                <p className="text-blue-200 text-lg font-medium">{profile.title}</p>
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-300">
                    <div className="flex items-center gap-2"><MapPin size={16}/> {profile.location}</div>
                    <div className="flex items-center gap-2"><Briefcase size={16}/> {profile.experience} Experience</div>
                </div>
            </div>
            
            <Link 
                to="/profile/edit" 
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
            >
                <PenTool size={16} /> Edit Profile
            </Link>
        </div>

        {/* Body Section */}
        <div className="p-8 space-y-8">
            
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-3 border border-gray-100">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Mail size={20}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Email</p>
                        <p className="text-gray-800 font-medium">{profile.contact_email}</p>
                    </div>
                </div>
                {profile.phone && (
                    <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-3 border border-gray-100">
                        <div className="bg-green-100 p-2 rounded-full text-green-600"><Phone size={20}/></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Phone</p>
                            <p className="text-gray-800 font-medium">{profile.phone}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* About */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">About Me</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{profile.bio || "No bio added."}</p>
            </div>

            {/* Skills */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                            {skill}
                        </span>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

export default ViewProfile;