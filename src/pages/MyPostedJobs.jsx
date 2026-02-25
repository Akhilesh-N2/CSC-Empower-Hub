import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { MapPin, Briefcase, IndianRupee, Edit, Trash2, Eye, EyeOff, Lock } from 'lucide-react';

function MyPostedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch User's Jobs
  useEffect(() => {
    const fetchMyJobs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('jobs')
          // OPTIMIZATION: Only select the columns used to render the card
          .select('id, title, company, is_active, location, salary, type, description, admin_override')
          .eq('provider_id', user.id) 
          .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setJobs(data || []);
      }
      setLoading(false);
    };
    fetchMyJobs();
  }, []);

  // 2. Delete Job
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this job?")) return;

    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      setJobs(jobs.filter(job => job.id !== id)); 
    } catch (error) {
      alert("Error deleting job: " + error.message);
    }
  };

  // 3. Toggle Active Status (With Admin Check)
  const toggleStatus = async (id, currentStatus, adminOverride) => {
    // IF user is trying to Activate, but Admin has locked it -> BLOCK ACTION
    if (!currentStatus && adminOverride) {
      alert("⚠️ This job was disabled by an Administrator.\nYou cannot reactivate it. Please contact support.");
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      // Update UI
      setJobs(jobs.map(job =>
        job.id === id ? { ...job, is_active: !currentStatus } : job
      ));
    } catch (error) {
      alert("Error updating status");
    }
  };

  if (loading) return <div className="text-center p-10">Loading your jobs...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Posted Jobs</h1>
          <Link to="/post-job" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
            + Post New Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200">
            <h3 className="text-xl text-gray-600 font-bold">You haven't posted any jobs yet.</h3>
            <p className="text-gray-400 mb-4">Create your first job listing today!</p>
            <Link to="/post-job" className="text-blue-600 hover:underline font-bold">Post a Job</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <div key={job.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col ${!job.is_active ? 'opacity-75 bg-gray-50' : ''}`}>

                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 pr-2">
                    <h2 className="text-lg font-bold text-gray-900 leading-tight truncate" title={job.title}>{job.title}</h2>
                    <p className="text-sm text-blue-600 font-medium truncate" title={job.company}>{job.company}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase shrink-0 ${job.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {job.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-gray-600 mb-6 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="shrink-0" /> <span className="truncate" title={job.location}>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee size={16} className="shrink-0" /> <span className="truncate" title={job.salary}>{job.salary || "Not Disclosed"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="shrink-0" /> <span className="truncate">{job.type}</span>
                  </div>
                  {/* Changed <p> to <div> for block-level safety if description has line breaks */}
                  <div className="line-clamp-2 mt-2 text-gray-500">{job.description}</div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t flex justify-between items-center">

                  {/* Toggle Visibility */}
                  <button
                    onClick={() => toggleStatus(job.id, job.is_active, job.admin_override)}
                    className={`p-2 rounded hover:bg-gray-100 ${job.admin_override && !job.is_active ? 'text-red-400 cursor-not-allowed' : 'text-gray-500 hover:text-gray-800'}`}
                    title={job.is_active ? "Hide Job" : (job.admin_override ? "Disabled by Admin" : "Publish Job")}
                  >
                    {job.admin_override && !job.is_active ? <Lock size={20} /> : (job.is_active ? <Eye size={20} /> : <EyeOff size={20} />)}
                  </button>

                  <div className="flex gap-2">
                    <Link
                      to={`/edit-job/${job.id}`}
                      className="flex items-center gap-1 text-blue-600 font-bold text-sm bg-blue-50 px-3 py-2 rounded hover:bg-blue-100"
                    >
                      <Edit size={16} /> Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="flex items-center gap-1 text-red-600 font-bold text-sm bg-red-50 px-3 py-2 rounded hover:bg-red-100"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyPostedJobs;