import React, { useState, useMemo } from 'react'
import Search from '../components/Search'
import SchemeCard from '../components/SchemeCard'
import Carousel from '../components/Carousel'

function LandingPage({ schemes, carouselSlides }) {
    // 1. ADD STATE: To track search text and selected category
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // 2. GET UNIQUE CATEGORIES
    const categories = ["All", ...new Set(schemes.map(item => item.category))];

    // 3. FILTER LOGIC
    const filteredSchemes = schemes.filter((scheme) => {
        // Step A: Check if it matches the category (or if "All" is selected)
        const categoryMatch = selectedCategory === "All" || scheme.category === selectedCategory;

        // Step B: Check if it matches the search text (Case insensitive)
        const searchMatch = scheme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            scheme.description.toLowerCase().includes(searchQuery.toLowerCase());

        return (scheme.active === true) && categoryMatch && searchMatch;
    });

    // Handle the search from the child component
    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            
            {/* CAROUSEL SECTION */}
            <Carousel slides={carouselSlides} />

            {/* MAIN CONTENT AREA */}
            <div className="p-4 md:p-10">
                <h1 className="text-3xl font-bold text-center mb-8 text-slate-800">Find Content</h1>

                {/* SEARCH COMPONENT */}
                <Search onSearch={handleSearch} />

                {/* CATEGORY FILTER BUTTONS */}
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-300 border ${selectedCategory === cat
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105" // Active Style
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"   // Inactive Style
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* SCHEMES GRID SECTION */}
                <div className="mt-12">
                    <h1 className="text-2xl md:text-3xl font-bold text-center mb-10 text-gray-800">
                        Useful Links
                        {selectedCategory !== 'All' && <span className="text-blue-600"> ({selectedCategory})</span>}
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto justify-items-center">
                        {filteredSchemes.length > 0 ? (
                            filteredSchemes.map((scheme) => (
                                <SchemeCard
                                    key={scheme.id}
                                    image={scheme.image}
                                    title={scheme.title}
                                    category={scheme.category}
                                    description={scheme.description}
                                    visitUrl={scheme.visitUrl}
                                    downloadUrl={scheme.downloadUrl}
                                />
                            ))
                        ) : (
                            // Show this if no results match
                            <div className="col-span-full text-center text-gray-500 mt-10">
                                <p className="text-xl">No schemes found matching "{searchQuery}"</p>
                                <button 
                                    onClick={() => {setSearchQuery(""); setSelectedCategory("All");}}
                                    className="mt-4 text-blue-600 underline"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LandingPage