import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null); // Store provider profile data

  // Form State
  const [jobData, setJobData] = useState({
    title: '',
    company: '',       // If empty, use profile.company_name
    location: '',      // If empty, use profile.location
    salary: '',
    description: '',
    type: 'Full-time',
    contact_phone: '', // If empty, use profile.contact_phone
    contact_email: ''  // If empty, use auth email
  });

  // 1. Fetch Provider Profile on Load
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get generic profile (for email)
        const { data: genericProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();

        // Get provider details (for company name, location, phone)
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile({
          email: genericProfile?.email,
          ...providerProfile
        });
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setJobData({ ...jobData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("You must be logged in to post a job.");

      // --- SMART DEFAULTS LOGIC ---
      // If the field is empty, fallback to the profile data.
      const finalJobData = {
        title: jobData.title,
        salary: jobData.salary,
        description: jobData.description,
        type: jobData.type,
        provider_id: user.id,
        
        // Smart Fields: Use input OR fallback to profile
        company: jobData.company || profile?.company_name || "Unknown Company",
        location: jobData.location || profile?.location || "Remote",
        contact_phone: jobData.contact_phone || profile?.contact_phone || "",
        contact_email: jobData.contact_email || profile?.email || user.email
      };

      const { error } = await supabase
        .from('jobs')
        .insert([finalJobData]);

      if (error) throw error;

      alert("Job posted successfully!");
      navigate('/find-talent'); // Redirect to dashboard or listing

    } catch (error) {
      alert("Error posting job: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        
        <div>
          <h2 className="text-3xl font-bold text-gray-900 text-center">Post a New Job</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Leave fields blank to use your default profile information.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Job Title (Required) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Job Title *</label>
              <input 
                name="title" 
                required 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Senior Electrician"
                onChange={handleChange}
              />
            </div>

            {/* Company Name (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Company Name <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <input 
                name="company" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={profile?.company_name ? `Default: ${profile.company_name}` : "Enter Company Name"}
                onChange={handleChange}
              />
            </div>

            {/* Location (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Location <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <input 
                name="location" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={profile?.location ? `Default: ${profile.location}` : "e.g. Kochi"}
                onChange={handleChange}
              />
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Salary / Pay</label>
              <input 
                name="salary" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 15000 - 20000"
                onChange={handleChange}
              />
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Job Type</label>
              <select 
                name="type" 
                className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={handleChange}
                value={jobData.type}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            {/* Contact Phone (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Contact Phone <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <input 
                name="contact_phone" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={profile?.contact_phone ? `Default: ${profile.contact_phone}` : "+91..."}
                onChange={handleChange}
              />
            </div>

            {/* Contact Email (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Contact Email <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <input 
                name="contact_email" 
                type="email"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={profile?.email ? `Default: ${profile.email}` : "you@example.com"}
                onChange={handleChange}
              />
            </div>

            {/* Description */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Job Description *</label>
              <textarea 
                name="description" 
                rows="4"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Describe the role and responsibilities..."
                onChange={handleChange}
              ></textarea>
            </div>

          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-md transition-all 
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}
          >
            {loading ? 'Posting...' : 'Post Job Now'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PostJob;