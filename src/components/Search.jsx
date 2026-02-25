import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

const Search = ({ onSearch, initialValue = "", placeholder = "Search for schemes..." }) => {
  const [query, setQuery] = useState(initialValue);

  // Sync state if initialValue changes from parent
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // OPTIMIZATION: Debounce the search
  // This prevents the UI from "stuttering" by waiting 300ms after the user stops typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (onSearch) onSearch(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    if (onSearch) onSearch('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto w-full group">
      <label htmlFor="default-search" className="sr-only">
        Search
      </label>
      <div className="relative">
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
          <SearchIcon 
            size={18}
            className="text-gray-400 group-focus-within:text-blue-500 transition-colors" 
          />
        </div>

        {/* Input Field */}
        <input 
          type="text" // Changed from 'search' to 'text' to custom-handle the 'X' button
          id="default-search" 
          className="block w-full p-4 ps-11 pe-24 text-sm text-gray-900 border border-gray-200 rounded-2xl bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm hover:border-gray-300" 
          placeholder={placeholder} 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Right Action Area (Clear + Search Button) */}
        <div className="absolute end-2 bottom-2 top-2 flex items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          
          <button 
            type="submit" 
            className="hidden sm:block h-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 transition-all active:scale-95 shadow-sm"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
};

export default Search;