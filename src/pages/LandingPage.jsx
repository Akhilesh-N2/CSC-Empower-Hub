import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient' // <--- Make sure this import path is correct
import Search from '../components/Search'
import SchemeCard from '../components/SchemeCard'
import Carousel from '../components/Carousel'
import SmartText from '../components/SmartText'

function LandingPage() { // <--- Removed props, we fetch data internally now
    // 1. STATE FOR DATA
    const [schemes, setSchemes] = useState([]);
    const [carouselSlides, setCarouselSlides] = useState([]);

    // 2. STATE FOR UI
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // --- FETCHING LOGIC ---

    // Fetch Schemes (Useful Links)
    const fetchSchemes = async () => {
        const { data, error } = await supabase
            .from('schemes')
            .select('*')
            .eq('active', true) // Only show active schemes
            .neq('category', 'Poster')
            .order('id', { ascending: false }); // Newest first
        if (!error) setSchemes(data || []);
    };

    // Fetch Carousel Slides
    const fetchSlides = async () => {
        const { data, error } = await supabase
            .from('slides')
            .select('*')
            .order('id', { ascending: true });
        if (!error) setCarouselSlides(data || []);
    };

    // --- REAL-TIME SUBSCRIPTION ---
    useEffect(() => {
        // A. Initial Load
        fetchSchemes();
        fetchSlides();

        // B. Set up Realtime Listener
        const channel = supabase
            .channel('landing-page-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'schemes' },
                (payload) => {
                    console.log('Schemes updated!', payload);
                    fetchSchemes();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'slides' },
                (payload) => {
                    console.log('Slides updated!', payload);
                    fetchSlides();
                }
            )
            .subscribe();

        // C. Cleanup
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);


    // --- FILTERING LOGIC (Unchanged) ---
    const categories = useMemo(() => ["All", ...Array.from(new Set(schemes.map(item => item?.category).filter(Boolean)))], [schemes]);

    const filteredSchemes = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return schemes.filter((scheme) => {
            // Note: We already filtered 'active' in the SQL query, but double-checking is fine
            if (!scheme) return false;

            const categoryMatch = selectedCategory === "All" || scheme.category === selectedCategory;
            if (!q) return categoryMatch;

            const title = (scheme.title || "").toLowerCase();
            const desc = (scheme.description || "").toLowerCase();
            return categoryMatch && (title.includes(q) || desc.includes(q));
        });
    }, [schemes, selectedCategory, searchQuery]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentSchemes = filteredSchemes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSchemes.length / itemsPerPage);

    const handleSearch = (query) => setSearchQuery(query);

    // Reset to Page 1 on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory]);


    return (
        <div className="bg-gray-50 min-h-screen">
            {/* HERO / CAROUSEL */}
            <div className="bg-gradient-to-r from-sky-50 via-white to-white pb-6">
                {/* Only render the Carousel if there is at least one slide. 
       Adding a unique key based on length forces React to 
       re-evaluate correctly when data arrives.
    */}
                {carouselSlides && carouselSlides.length > 0 ? (
                    <Carousel slides={carouselSlides} key={`carousel-${carouselSlides.length}`} />
                ) : (
                    <div className="h-64 flex items-center justify-center bg-gray-100 animate-pulse rounded-xl mx-4">
                        <p className="text-gray-400">Loading Latest Updates...</p>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-[92rem] mx-auto px-4 py-8 md:py-12 border border-gray-200 rounded-xl bg-white">
                {/* Search + Category row */}
                <div className="flex flex-col md:items-center gap-4 md:gap-6">
                    <div className="w-full">
                        <Search onSearch={handleSearch} initialValue={searchQuery} />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="sr-only">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-3 cursor-pointer rounded-full text-sm font-medium transition-colors duration-200 border ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                            className="ml-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                            aria-label="Clear filters"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Results header */}
                <div className='mt-8 flex flex-col gap-2'>
                    <h1 className='text-xl md:text-4xl font-bold text-slate-800 text-center'>
                        <SmartText ml="പ്രധാന ലിങ്കുകൾ">
                            Useful Links
                        </SmartText>
                    </h1>
                </div>

                {/* Grid */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {currentSchemes.length > 0 ? (
                        currentSchemes.map(scheme => (
                            <div key={scheme.id} className="w-full">
                                <SchemeCard
                                    image={scheme.image} // Changed from scheme.image_url if your DB uses 'image'
                                    title={scheme.title}
                                    category={scheme.category}
                                    description={scheme.description}
                                    visitUrl={scheme.visitUrl}
                                    downloadUrl={scheme.downloadUrl}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center text-slate-600 py-12 border border-dashed border-gray-100 rounded">
                            <p className="text-lg">No items match your search.</p>
                            <p className="mt-2 text-sm">Try different keywords or pick a different category.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filteredSchemes.length > itemsPerPage && (
                    <div className="flex justify-center gap-4 mt-8 notranslate">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 w-24 border rounded bg-gray-100 text-black shadow-md hover:bg-gray-500 hover:text-white scale-100 hover:scale-102 transition-transform disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-black"
                        >
                            Previous
                        </button>

                        <div className='mt-2 text-sm text-slate-600 '>
                            {`${indexOfFirstItem + 1} to ${indexOfFirstItem + currentSchemes.length} of ${filteredSchemes.length} results`}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 w-24 border border rounded bg-gray-100 text-black shadow-md hover:bg-gray-500 hover:text-white scale-100 hover:scale-102 transition-transform disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-black"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LandingPage