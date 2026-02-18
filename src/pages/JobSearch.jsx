import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, MapPin, Briefcase, IndianRupee, Filter, Phone, Mail } from 'lucide-react';

function JobSearch() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Mobile toggle

  // --- FILTERS STATE ---
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    minSalary: 0,
    type: ''
  });

  // --- HELPER 1: SMART SALARY PARSER (Range Support) ---
  // This finds the MAXIMUM potential salary in a text string.
  // "60k - 90k" -> Returns 90000.
  const parseMaxSalary = (salaryInput) => {
    if (!salaryInput) return 0;
    
    // Normalize: lowercase, remove commas
    const str = String(salaryInput).toLowerCase().replace(/,/g, '');
    
    // Regex to find numbers, optionally followed by 'k' or 'l'
    // Matches: "50", "50.5", "50k", "50l"
    const regex = /(\d+(\.\d+)?)\s*(k|l|lakhs?|thousands?)?/g;
    
    let maxVal = 0;
    let match;

    // Loop through ALL numbers found in the string
    while ((match = regex.exec(str)) !== null) {
      let val = parseFloat(match[1]);
      const multiplierStr = match[3] || '';

      // Apply multipliers
      if (multiplierStr.startsWith('k')) val *= 1000;
      else if (multiplierStr.startsWith('l')) val *= 100000;

      // Keep the highest number found
      if (val > maxVal) maxVal = val;
    }
    
    return maxVal;
  };

  // --- HELPER 2: DISPLAY FORMATTING ---
  const formatSalary = (salary) => {
    if (!salary) return 'Not Disclosed';
    // If it looks like a pure number, format it
    const num = Number(salary);
    if (!isNaN(num)) return `₹${num.toLocaleString()}`;
    // Otherwise return text as-is (e.g. "10k - 20k")
    return salary;
  };

  // --- 1. FETCH JOBS ---
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true) 
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  // --- 2. FILTER LOGIC ---
  const filteredJobs = jobs.filter(job => {
    // A. Category (Partial match)
    const matchCategory = filters.category === '' || 
                          job.title.toLowerCase().includes(filters.category.toLowerCase());
    
    // B. Location (Partial match)
    const matchLocation = filters.location === '' || 
                          job.location.toLowerCase().includes(filters.location.toLowerCase());

    // C. Salary (Checks MAX potential vs Filter)
    const jobMaxSalary = parseMaxSalary(job.salary); // "60k-90k" becomes 90000
    // If filter is 0, show everything. If filter > 0, hide "Negotiable" (0) jobs.
    const matchSalary = filters.minSalary === 0 || jobMaxSalary >= filters.minSalary;

    // D. Job Type (Exact match)
    const matchType = filters.type === '' || job.type === filters.type;

    return matchCategory && matchLocation && matchSalary && matchType;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      
      {/* --- MOBILE FILTER TOGGLE --- */}
      <div className="md:hidden p-4 bg-white shadow-sm flex justify-between items-center sticky top-16 z-30">
        <h2 className="font-bold text-gray-800">Find Jobs</h2>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)} 
          className="flex items-center gap-2 text-blue-600 font-bold border border-blue-100 px-3 py-1 rounded"
        >
          <Filter size={18}/> Filters
        </button>
      </div>

      {/* --- LEFT SIDEBAR: FILTERS --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:shadow-none md:w-1/4 md:block border-r border-gray-200
        ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Filters</h2>
            <button onClick={() => setIsFilterOpen(false)} className="md:hidden text-gray-400"><Filter size={20}/></button>
          </div>

          {/* 1. KEYWORD / CATEGORY */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Job Role</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="e.g. Driver, Electrician" 
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 2. LOCATION */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="e.g. Kochi" 
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 3. SALARY SLIDER */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Min Salary: ₹{filters.minSalary.toLocaleString()}
            </label>
            <input 
              type="range" 
              min="0" 
              max="100000" 
              step="5000" 
              value={filters.minSalary}
              onChange={(e) => setFilters({...filters, minSalary: Number(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>₹0</span>
              <span>₹1L+</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Note: Sliding this hides "Negotiable" or undetermined salaries.
            </p>
          </div>

          {/* 4. JOB TYPE */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Job Type</label>
            <select 
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full p-2 border rounded-lg bg-white"
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>

          {/* RESET BUTTON */}
          <button 
            onClick={() => setFilters({ category: '', location: '', minSalary: 0, type: '' })}
            className="w-full py-2 text-red-600 font-bold border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            Reset Filters
          </button>
        </div>
      </aside>

      {/* --- RIGHT SIDE: JOB LIST --- */}
      <main className="flex-1 p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {filteredJobs.length} Jobs Found
        </h1>
        <p className="text-gray-500 mb-6">Find the perfect job for your skills.</p>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-4"/>
            <h3 className="text-lg font-bold text-gray-600">No jobs match your filters</h3>
            <p className="text-gray-400">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col h-full">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h2>
                    <p className="text-blue-600 font-medium">{job.company}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase rounded-full border border-green-100">
                    {job.type || 'Full-time'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin size={16} className="mr-2 text-gray-400"/> {job.location}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <IndianRupee size={16} className="mr-2 text-gray-400"/> 
                    {formatSalary(job.salary)}
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-4 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {job.description}
                  </p>
                </div>

                {/* --- CONTACT INFO (REPLACED BUTTONS) --- */}
                <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2">
                   {/* Phone */}
                   {job.contact_phone ? (
                     <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                           <Phone size={14} />
                        </div>
                        {job.contact_phone}
                     </div>
                   ) : (
                      <span className="text-xs text-gray-400 italic pl-1">No phone number provided</span>
                   )}

                   {/* Email */}
                   {job.contact_email ? (
                     <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                           <Mail size={14} />
                        </div>
                        <span className="truncate">{job.contact_email}</span>
                     </div>
                   ) : (
                      <span className="text-xs text-gray-400 italic pl-1">No email provided</span>
                   )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}

export default JobSearch;