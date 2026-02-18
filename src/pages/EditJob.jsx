import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

function EditJob() {
  const { id } = useParams(); // Get Job ID from URL
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // 1. Load Job Data
  useEffect(() => {
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        alert("Error loading job.");
        navigate('/my-jobs');
      } else {
        setJobData(data);
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate]);

  const handleChange = (e) => {
    setJobData({ ...jobData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
            title: jobData.title,
            company: jobData.company,
            location: jobData.location,
            salary: jobData.salary,
            description: jobData.description,
            type: jobData.type,
            contact_phone: jobData.contact_phone,
            contact_email: jobData.contact_email
        })
        .eq('id', id);

      if (error) throw error;
      alert("Job updated successfully!");
      navigate('/my-jobs');

    } catch (error) {
      alert("Update failed: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-10">Loading job details...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10 px-4">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Job</h2>
        
        <form className="space-y-5" onSubmit={handleUpdate}>
          {/* Reuse the input structure from PostJob, but simplified here for brevity */}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Job Title</label>
            <input name="title" value={jobData.title} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Company</label>
               <input name="company" value={jobData.company} onChange={handleChange} className="w-full p-2 border rounded" />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
               <input name="location" value={jobData.location} onChange={handleChange} className="w-full p-2 border rounded" />
             </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-700 mb-1">Salary</label>
             <input name="salary" value={jobData.salary} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-700 mb-1">Job Type</label>
             <select name="type" value={jobData.type} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
             </select>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
               <input name="contact_phone" value={jobData.contact_phone} onChange={handleChange} className="w-full p-2 border rounded" />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
               <input name="contact_email" value={jobData.contact_email} onChange={handleChange} className="w-full p-2 border rounded" />
             </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
            <textarea name="description" value={jobData.description} onChange={handleChange} rows="5" className="w-full p-2 border rounded"></textarea>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 w-full">
              {saving ? "Saving..." : "Update Job"}
            </button>
            <button type="button" onClick={() => navigate('/my-jobs')} className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-bold hover:bg-gray-300">
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default EditJob;