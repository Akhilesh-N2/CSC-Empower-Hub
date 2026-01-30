import React, { useState } from 'react';

function FormsPage({ schemes, categories }) {
    const [activeCategory, setActiveCategory] = useState(null); // Null = View All Categories
    const [searchTerm, setSearchTerm] = useState("");

    // Helper: Count how many forms are in a category
    const getCount = (cat) => {
        return schemes.filter(s => s.category === cat && s.downloadUrl && s.active).length;
    };

    // --- FILTER LOGIC ---
    // This determines what shows up in the list
    const currentList = schemes.filter(scheme => {
        // 1. Basic Checks: Must be Active & Have a File
        if (!scheme.active || !scheme.downloadUrl) return false;

        // 2. Search Filter
        const matchesSearch = scheme.title.toLowerCase().includes(searchTerm.toLowerCase());

        // 3. Category Filter
        // If a category is selected, matching that category is required.
        // If NO category is selected (Global Search), then we accept ANY category.
        const matchesCategory = activeCategory ? scheme.category === activeCategory : true;

        return matchesSearch && matchesCategory;
    });

    // Decide whether to show the LIST or the CATEGORIES
    // We show the list if:
    // 1. A category is selected OR
    // 2. The user has typed something in the search bar
    const showListView = activeCategory || searchTerm.length > 0;

    const handleBack = () => {
        setActiveCategory(null);
        setSearchTerm("");
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">

                {/* HEADER */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Forms Repository</h1>
                    <p className="text-gray-500 mt-2">
                        {activeCategory
                            ? `Browsing ${activeCategory}`
                            : "Search across all categories or select a folder below"}
                    </p>
                </div>

                {/* --- GLOBAL SEARCH BAR --- */}
                <div className="mb-10 relative max-w-lg mx-auto">
                    <input
                        type="text"
                        placeholder={activeCategory ? `Search inside ${activeCategory}...` : "Search for any form (e.g., 'Housing', 'Loan')..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl shadow-sm border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                    />
                    <span className="absolute left-4 top-3.5 text-gray-400 text-xl">🔍</span>

                    {/* Clear Search Button */}
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* --- VIEW 1: CATEGORY GRID --- */}
                {/* Only show this if we are NOT searching and NOT inside a category */}
                {!showListView && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                        {categories.map((cat, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveCategory(cat)}
                                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left group"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {/* Folder Icon */}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                                        </svg>
                                    </div>
                                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                                        {getCount(cat)} files
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">{cat}</h3>
                                <p className="text-sm text-gray-400">View documents &rarr;</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* --- VIEW 2: FILE LIST --- */}
                {/* Shown when searching OR browsing a category */}
                {showListView && (
                    <div className="animate-fade-in-up">

                        {/* --- NEW: HIGH VISIBILITY BACK BUTTON ---
                        <div className="mb-4">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                                </svg>
                                Back to Categorie
                            </button>
                        </div> */}

                        {/* Header for List View */}
                        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                            <h2 className="text-xl font-bold text-slate-800">
                                {searchTerm
                                    ? `Search Results for "${searchTerm}"`
                                    : `${activeCategory} Documents`
                                }
                            </h2>

                            {/* Back Button */}
                            <button
                                onClick={() => { setActiveCategory(null); setSearchTerm(""); }}
                                className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z" clipRule="evenodd" />
                                </svg>
                                Back to Categories
                            </button>
                        </div>

                        {/* THE RESULTS LIST */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                            {currentList.length > 0 ? (
                                currentList.map(form => (
                                    <div key={form.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">

                                        {/* Left Side: Info */}
                                        <div className="pr-4">
                                            {/* Show Category Badge if doing Global Search */}
                                            {!activeCategory && (
                                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                                                    {form.category}
                                                </span>
                                            )}

                                            <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                                {form.title}
                                            </h4>
                                            {form.description && (
                                                <p className="text-xs text-gray-500 line-clamp-1 mt-1">{form.description}</p>
                                            )}
                                        </div>

                                        {/* Right Side: Download Button */}
                                        <a
                                            href={form.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-600 hover:text-white transition-all flex-shrink-0"
                                            title="Download PDF"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 3v13.5m0 0-3-3m3 3 3-3" />
                                            </svg>
                                        </a>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center text-gray-400">
                                    <div className="text-3xl mb-2">🔍</div>
                                    <p>No forms found matching your search.</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

export default FormsPage;