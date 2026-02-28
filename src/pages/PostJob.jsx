import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null); 

  // Form State
  const [jobData, setJobData] = useState({
    title: '',
    company: '',       
    location: '',      
    salary: '',
    description: '',
    type: 'Full-time',
    contact_phone: '', 
    contact_email: ''  
  });

  // Error Tracking State
  const [errors, setErrors] = useState({});

  // 1. Fetch Provider Profile on Load and PRE-FILL the form
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        // Get generic profile (for email)
        const { data: genericProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle();

        // Get provider details
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('company_name, location, contact_phone') 
          .eq('id', user.id)
          .maybeSingle();

        const fetchedEmail = genericProfile?.email || user.email;

        setProfile({
          email: fetchedEmail, 
          ...providerProfile
        });

        // Automatically fill the form state with the fetched defaults!
        setJobData(prevData => ({
          ...prevData,
          company: providerProfile?.company_name || '',
          location: providerProfile?.location || '',
          contact_phone: providerProfile?.contact_phone || '',
          contact_email: fetchedEmail || ''
        }));

      } catch (err) {
        console.error("Error fetching provider defaults:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobData({ ...jobData, [name]: value });
    
    // Clear the error for this field as the user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // --- CUSTOM VALIDATION LOGIC ---
    const newErrors = {
      title: !jobData.title.trim(),
      description: !jobData.description.trim(),
    };

    // Check if ANY error flag is true for required fields
    if (newErrors.title || newErrors.description) {
      setErrors(newErrors);
      return; // Stop submission
    }

    setErrors({});
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("You must be logged in to post a job.");

      // --- SUBMIT DATA ---
      const finalJobData = {
        title: jobData.title,
        salary: jobData.salary,
        description: jobData.description,
        type: jobData.type,
        provider_id: user.id,
        is_active: true, 
        
        // Use the form state (which is now pre-filled with defaults or user edits)
        company: jobData.company || "Independent Provider",
        location: jobData.location || "Not Specified",
        contact_phone: jobData.contact_phone || "",
        contact_email: jobData.contact_email || user.email
      };

      const { error } = await supabase
        .from('jobs')
        .insert([finalJobData]);

      if (error) throw error;

      alert("Job posted successfully!");
      navigate('/my-jobs'); 

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
            We've pre-filled your default profile information. Feel free to edit it.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Job Title (Required) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Job Title *</label>
              <input 
                name="title" 
                required 
                className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${
                  errors.title 
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                }`}
                placeholder="e.g. Senior Electrician"
                onChange={handleChange}
                value={jobData.title}
              />
              {/* NEW: Explicit Error Message */}
              {errors.title && (
                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                  ⚠️ Job Title is required
                </p>
              )}
            </div>

            {/* Company Name (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Company Name <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <input 
                name="company" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Enter Company Name"
                onChange={handleChange}
                value={jobData.company}
              />
            </div>

            {/* Location (Optional) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Location <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <input 
                name="location" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. Kochi"
                onChange={handleChange}
                value={jobData.location}
              />
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Salary / Pay</label>
              <input 
                name="salary" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. 15000 - 20000"
                onChange={handleChange}
                value={jobData.salary}
              />
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Job Type</label>
              <select 
                name="type" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="+91..."
                onChange={handleChange}
                value={jobData.contact_phone}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="you@example.com"
                onChange={handleChange}
                value={jobData.contact_email}
              />
            </div>

            {/* Description (Required) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Job Description *</label>
              <textarea 
                name="description" 
                rows="4"
                required
                className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${
                  errors.description 
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50 placeholder-red-300' 
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white'
                }`}
                placeholder="Describe the role and responsibilities..."
                onChange={handleChange}
                value={jobData.description}
              ></textarea>
              {/* NEW: Explicit Error Message */}
              {errors.description && (
                <p className="text-red-500 text-xs font-bold mt-1.5 ml-1 flex items-center gap-1">
                  ⚠️ Job Description is required
                </p>
              )}
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