import React, { useState } from 'react';

const Search = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">   
      <label htmlFor="default-search" className="mb-2 text-sm font-medium text-gray-900 sr-only">
        Search
      </label>
      <div className="relative">
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
          <svg 
            className="w-4 h-4 text-gray-500" 
            aria-hidden="true" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 20 20"
          >
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
          </svg>
        </div>

        {/* Input Field */}
        <input 
          type="search" 
          id="default-search" 
          className="block w-full p-4 ps-[2.5rem] text-sm text-gray-900 border border-gray-300 rounded-full bg-gray-50 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" 
          placeholder="Search for schemes..." 
          value={query}
          onChange={handleInputChange}
          required 
        />

        {/* Search Button */}
        <button 
          type="submit" 
          className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-2 focus:outline-none focus:ring-blue-400 font-medium rounded-full text-sm px-4 py-2 transition-colors duration-300"
        >
          Search
        </button>
      </div>
    </form>
  );
};

export default Search;