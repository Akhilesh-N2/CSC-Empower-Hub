import React, { useState, useMemo } from 'react'
import Search from '../components/Search'
import SchemeCard from '../components/SchemeCard'
import Carousel from '../components/Carousel' // Don't forget this import!

function LandingPage({ schemes, carouselSlides }) {
    // 1. ADD STATE: To track search text and selected category
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // 3. GET UNIQUE CATEGORIES (Auto-generates buttons based on your data)
    const categories = ["All", ...new Set(schemes.map(item => item.category))];

    // 4. FILTER LOGIC: This runs every time search or category changes
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
        <>
            <Carousel slides={carouselSlides}/>

            <div className="p-10 bg-gray-100 min-h-screen">
                <h1 className="text-3xl font-bold text-center mb-8">Find Content</h1>

                {/* SEARCH COMPONENT */}
                <Search onSearch={handleSearch} />

                {/* --- NEW: CATEGORY FILTER BUTTONS --- */}
                <div className="flex flex-wrap justify-center gap-4 mt-8">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full font-medium transition-all duration-300 border ${
                                selectedCategory === cat
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105" // Active Style
                                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"   // Inactive Style
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="min-h-screen bg-gray-100 p-8">
                    <h1 className="text-3xl font-bold text-center mb-10 text-gray-800">
                        Government Schemes 
                        {selectedCategory !== 'All' && <span className="text-blue-600"> ({selectedCategory})</span>}
                    </h1>

                    {/* GRID: Map over 'filteredSchemes' instead of 'schemesData' */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto justify-items-center">
                        
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
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    )
}

export default LandingPage