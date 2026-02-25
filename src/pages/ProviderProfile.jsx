import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Building, MapPin, Globe, Phone, FileText, Save, Edit2 } from 'lucide-react';

function ProviderProfile() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userSession, setUserSession] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    location: '',
    website: '',
    contact_phone: '',
    about_company: ''
  });

  // 1. Fetch Profile on Load
  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setLoading(false);
          return;
        }

        setUserSession(user);

        const { data, error } = await supabase
          .from('provider_profiles')
          .select('*') // Correct, we need all fields
          .eq('id', user.id)
          .maybeSingle(); // OPTIMIZATION: Prevents throwing an error if row doesn't exist yet

        if (error) {
          console.error("Error fetching provider profile:", error);
        } else if (data) {
          // OPTIMIZATION: Safely fallback to empty strings for null DB values
          setFormData({
            company_name: data.company_name || '',
            industry: data.industry || '',
            location: data.location || '',
            website: data.website || '',
            contact_phone: data.contact_phone || '',
            about_company: data.about_company || ''
          });
        } else {
          // If no profile exists yet, force Edit mode
          setIsEditing(true);
        }
      } catch (err) {
        console.error("Unexpected error loading provider profile:", err);
      } finally {
        setLoading(false);
      }
    };
    
    getProfile();
  }, []);

  // 2. Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Save Changes
  const handleSave = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const updates = {
        id: userSession.id, // Link to the logged-in user
        ...formData,
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('provider_profiles')
        .upsert(updates);

      if (error) throw error;
      
      alert("Profile updated successfully!");
      setIsEditing(false);

    } catch (error) {
      alert("Error updating profile: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="text-center p-10">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Company Profile</h1>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Edit2 size={18} /> Edit Profile
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* --- VIEW MODE --- */}
          {!isEditing ? (
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Building size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {formData.company_name || "Your Company Name"}
                  </h2>
                  <p className="text-gray-500">{formData.industry || "Industry Not Set"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="text-gray-400" />
                  <span>{formData.location || "Location not added"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="text-gray-400" />
                  <span>{formData.contact_phone || "No phone added"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Globe className="text-gray-400" />
                  {formData.website ? (
                    <a href={formData.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {formData.website}
                    </a>
                  ) : (
                    <span>No website added</span>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-bold text-gray-900 mb-2">About the Company</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {formData.about_company || "Add a description to help job seekers know more about you."}
                </p>
              </div>
            </div>

          ) : (
            
            /* --- EDIT MODE --- */
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Company Name */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                  <input 
                    type="text" 
                    name="company_name" 
                    value={formData.company_name} 
                    onChange={handleChange} 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Acme Corp"
                    required
                  />
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Industry</label>
                  <input 
                    type="text" 
                    name="industry" 
                    value={formData.industry} 
                    onChange={handleChange} 
                    className="w-full p-3 border rounded-lg outline-none"
                    placeholder="e.g. Software, Construction"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Location (HQ)</label>
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    className="w-full p-3 border rounded-lg outline-none"
                    placeholder="e.g. Kochi, Kerala"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Contact Phone</label>
                  <input 
                    type="text" 
                    name="contact_phone" 
                    value={formData.contact_phone} 
                    onChange={handleChange} 
                    className="w-full p-3 border rounded-lg outline-none"
                    placeholder="+91 98765..."
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Website</label>
                  <input 
                    type="url" 
                    name="website" 
                    value={formData.website} 
                    onChange={handleChange} 
                    className="w-full p-3 border rounded-lg outline-none"
                    placeholder="https://..."
                  />
                </div>

                {/* About */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">About Company</label>
                  <textarea 
                    name="about_company" 
                    rows="4" 
                    value={formData.about_company} 
                    onChange={handleChange} 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Tell us about your organization..."
                  ></textarea>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <button 
                  type="submit" 
                  disabled={updating}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
                >
                  <Save size={18} /> {updating ? "Saving..." : "Save Profile"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderProfile;