import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Import Supabase
import { Search, MapPin, Briefcase, DollarSign, Clock } from 'lucide-react';

// --- HELPER: Calculate "Time Ago" (e.g. "2 days ago") ---
function timeAgo(dateString) {
  const now = new Date();
  const posted = new Date(dateString);
  const diffInSeconds = Math.floor((now - posted) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function JobSearch() {
  const [jobs, setJobs] = useState([]); // Store jobs from DB
  const [loading, setLoading] = useState(true); // Loading state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  // --- 1. FETCH JOBS FROM SUPABASE ---
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }); // Newest first

        if (error) throw error;
        setJobs(data || []);
      } catch (error) {
        console.error('Error fetching jobs:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // --- 2. FILTER LOGIC ---
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      job.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "All" || job.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-10 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
          Find Your Dream Job
        </h1>
        <p className="text-gray-500 text-lg">
          Browse open positions from top companies in your area.
        </p>
      </div>

      {/* SEARCH BAR */}
      <div className="max-w-5xl mx-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-10 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by job title or company..." 
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Internship">Internship</option>
            <option value="Freelance">Freelance</option>
          </select>
        </div>
      </div>

      {/* JOBS GRID */}
      {loading ? (
        // LOADING SKELETON (Optional visual polish)
        <div className="max-w-5xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading jobs...</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                
                {/* Job Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-gray-500 font-medium text-sm flex items-center gap-1 mt-1">
                      <Briefcase className="w-4 h-4" /> {job.company}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold 
                    ${job.type === 'Full Time' ? 'bg-green-100 text-green-700' : 
                      job.type === 'Internship' ? 'bg-purple-100 text-purple-700' : 
                      'bg-blue-100 text-blue-700'}`}>
                    {job.type}
                  </span>
                </div>

                {/* Job Details */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {job.location}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                    {job.salary || 'Not disclosed'}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    Posted {timeAgo(job.created_at)}
                  </div>
                </div>

                {/* Tags & Button */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex gap-2 flex-wrap">
                    {job.tags && job.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <a 
                    href={`mailto:${job.contact_email}?subject=Application for ${job.title}`}
                    className="bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Apply Now
                  </a>
                </div>

              </div>
            ))
          ) : (
            // EMPTY STATE
            <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
              <div className="text-gray-300 text-6xl mb-4">📂</div>
              <h3 className="text-xl font-semibold text-gray-600">No jobs posted yet</h3>
              <p className="text-gray-400">Be the first to post a job opportunity!</p>
            </div>
          )}
          
        </div>
      )}

    </div>
  )
}

export default JobSearch;