import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Make sure you have this file!
import { useNavigate } from 'react-router-dom';

function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    type: 'Full Time',
    description: '',
    contact_email: '',
    tags: '' // We will split this by comma later
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Convert "React, Remote" string into ["React", "Remote"] array
    const tagsArray = formData.tags.split(',').map(tag => tag.trim());

    // 2. Insert into Supabase
    const { error } = await supabase
      .from('jobs')
      .insert([
        {
          title: formData.title,
          company: formData.company,
          location: formData.location,
          salary: formData.salary,
          type: formData.type,
          description: formData.description,
          contact_email: formData.contact_email,
          tags: tagsArray
        }
      ]);

    setLoading(false);

    if (error) {
      alert('Error posting job: ' + error.message);
    } else {
      alert('Job Posted Successfully!');
      navigate('/job-search'); // Redirect back to Job Search page
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
      
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Post a New Job</h2>
          <p className="text-blue-100">Fill in the details to find the perfect candidate.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Row 1: Title & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input 
                required
                name="title"
                type="text" 
                placeholder="e.g. Senior React Developer"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input 
                required
                name="company"
                type="text" 
                placeholder="e.g. TechCorp Solutions"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 2: Location & Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input 
                required
                name="location"
                type="text" 
                placeholder="e.g. Kochi, Kerala (or Remote)"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
              <input 
                name="salary"
                type="text" 
                placeholder="e.g. ₹25k - ₹40k / month"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 3: Job Type & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select 
                name="type"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
                onChange={handleChange}
              >
                <option>Full Time</option>
                <option>Part Time</option>
                <option>Internship</option>
                <option>Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Comma separated)</label>
              <input 
                name="tags"
                type="text" 
                placeholder="e.g. React, Design, Urgent"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea 
              name="description"
              rows="4"
              placeholder="Describe the role and requirements..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              onChange={handleChange}
            ></textarea>
          </div>

           {/* Contact Email */}
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email (For Applications)</label>
            <input 
              name="contact_email"
              type="email" 
              placeholder="hr@company.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              onChange={handleChange}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all
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