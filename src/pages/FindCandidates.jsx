import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, MapPin, Briefcase, Phone, Mail } from 'lucide-react'; // Added Mail icon

function FindCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCandidates = async () => {
      const { data, error } = await supabase.from('seeker_profiles').select('*');
      if (!error) setCandidates(data);
    };
    fetchCandidates();
  }, []);

  const filtered = candidates.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Find Talent</h1>
        <p className="text-gray-600 mb-8">Browse profiles of people looking for work.</p>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-8 flex gap-2">
          <Search className="text-gray-400" />
          <input 
            placeholder="Search by Job Title or Skill..." 
            className="flex-1 outline-none"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Candidate Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(person => (
            <div key={person.id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
              
              {/* Header: Avatar & Name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl uppercase">
                  {person.full_name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 leading-tight">{person.full_name}</h3>
                  <p className="text-blue-600 text-sm font-medium">{person.title}</p>
                </div>
              </div>

              {/* Details: Experience & Location */}
              <div className="space-y-2 text-sm text-gray-600  pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-gray-400" /> 
                  <span className="font-medium text-gray-700">{person.experience}</span> Experience
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" /> 
                  <span className="font-medium text-gray-700">{person.location}</span>
                </div>

                {/* Skills Tags */}
              <div className="flex flex-wrap gap-2">
                {person.skills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600 font-medium">
                    {skill}
                  </span>
                ))}
              </div>
              </div>

              

              {/* Contact Details (Text Only) */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-800 select-all">{person.contact_email}</span>
                </div>
                {person.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-gray-800 select-all">{person.phone}</span>
                  </div>
                )}
              </div>

              

            </div>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-10">
              No candidates found matching "{search}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FindCandidates;