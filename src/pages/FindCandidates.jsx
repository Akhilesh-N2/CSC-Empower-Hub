import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, MapPin, Briefcase, Phone, Mail, Filter, UserCheck } from 'lucide-react';

function FindCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Mobile toggle

  // --- FILTER STATE ---
  const [filters, setFilters] = useState({
    keyword: '',    // Matches Title or Skills
    location: '',
    experience: ''  // Simple text match like "2 years"
  });

  // --- 1. FETCH CANDIDATES ---
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('seeker_profiles')
        .select('*')
        .order('updated_at', { ascending: false }); // Show recently active first

      if (error) console.error(error);
      else setCandidates(data || []);
      setLoading(false);
    };
    fetchCandidates();
  }, []);

  // --- 2. FILTER LOGIC ---
  const filteredCandidates = candidates.filter(person => {
    // A. Keyword (Checks Title AND Skills)
    const searchLower = filters.keyword.toLowerCase();
    const matchesKeyword = filters.keyword === '' || 
                           person.title.toLowerCase().includes(searchLower) ||
                           (person.skills && person.skills.some(s => s.toLowerCase().includes(searchLower)));

    // B. Location
    const matchesLocation = filters.location === '' || 
                            person.location.toLowerCase().includes(filters.location.toLowerCase());

    // C. Experience (Text Match)
    const matchesExperience = filters.experience === '' || 
                              person.experience.toLowerCase().includes(filters.experience.toLowerCase());

    return matchesKeyword && matchesLocation && matchesExperience;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">

      {/* --- MOBILE TOGGLE --- */}
      <div className="md:hidden p-4 bg-white shadow-sm flex justify-between items-center sticky top-16 z-30">
        <h2 className="font-bold text-gray-800">Find Talent</h2>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)} 
          className="flex items-center gap-2 text-blue-600 font-bold border border-blue-100 px-3 py-1 rounded"
        >
          <Filter size={18}/> Filters
        </button>
      </div>

      {/* --- LEFT SIDEBAR: FILTERS --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:shadow-none md:w-1/4 md:block border-r border-gray-200
        ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Filter Candidates</h2>
            <button onClick={() => setIsFilterOpen(false)} className="md:hidden text-gray-400"><Filter size={20}/></button>
          </div>

          {/* 1. KEYWORD SEARCH */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Role or Skill</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="e.g. Driver, React, Cooking" 
                value={filters.keyword}
                onChange={(e) => setFilters({...filters, keyword: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Searches both job titles and specific skills.</p>
          </div>

          {/* 2. LOCATION */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="e.g. Kochi, Malappuram" 
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 3. EXPERIENCE */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Experience</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="e.g. 2 Years" 
                value={filters.experience}
                onChange={(e) => setFilters({...filters, experience: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* RESET BUTTON */}
          <button 
            onClick={() => setFilters({ keyword: '', location: '', experience: '' })}
            className="w-full py-2 text-red-600 font-bold border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            Clear Filters
          </button>
        </div>
      </aside>


      {/* --- RIGHT SIDE: CANDIDATE LIST --- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {filteredCandidates.length} Candidates Found
        </h1>
        <p className="text-gray-500 mb-6">Browse profiles and contact candidates directly.</p>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading profiles...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
            <UserCheck size={48} className="mx-auto text-gray-300 mb-4"/>
            <h3 className="text-lg font-bold text-gray-600">No candidates found</h3>
            <p className="text-gray-400">Try changing your search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            {filteredCandidates.map(person => (
              <div key={person.id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col h-full">
                
                {/* Header: Avatar & Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl uppercase shrink-0">
                    {person.full_name ? person.full_name[0] : '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 leading-tight">{person.full_name}</h3>
                    <p className="text-blue-600 font-medium text-sm">{person.title}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 text-sm text-gray-600 mb-4 border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-gray-400" /> 
                    <span className="font-medium text-gray-700">{person.experience}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" /> 
                    <span className="font-medium text-gray-700">{person.location}</span>
                  </div>
                </div>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {person.skills && person.skills.slice(0, 4).map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-50 text-xs rounded text-gray-600 font-medium border border-gray-100">
                      {skill}
                    </span>
                  ))}
                  {person.skills && person.skills.length > 4 && (
                    <span className="px-2 py-1 bg-gray-50 text-xs rounded text-gray-400 font-medium">
                      +{person.skills.length - 4} more
                    </span>
                  )}
                </div>

                {/* Contact Footer */}
                <div className="mt-auto pt-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-800 truncate">{person.contact_email}</span>
                  </div>
                  {person.phone && (
                    <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-gray-800">{person.phone}</span>
                    </div>
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

export default FindCandidates;