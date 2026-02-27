import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Search from '../components/Search'
import SchemeCard from '../components/SchemeCard'
import Carousel from '../components/Carousel'
import SmartText from '../components/SmartText'
import { Filter, X, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

function LandingPage() { 
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
            // OPTIMIZATION: Only fetch exactly what the SchemeCard needs
            .select('id, image, title, category, description, visitUrl, downloadUrl') 
            .eq('active', true) 
            .eq('type', 'scheme')
            .neq('category', 'Poster')
            .order('id', { ascending: false }); 
        if (!error) setSchemes(data || []);
    };

    // Fetch Carousel Slides
    const fetchSlides = async () => {
        const { data, error } = await supabase
            .from('slides')
            // OPTIMIZATION: Only fetch what the Carousel needs
            .select('id, image, title, description, link, duration, object_fit') 
            .order('id', { ascending: true });
        if (!error) setCarouselSlides(data || []);
    };

    // --- REAL-TIME SUBSCRIPTION ---
    useEffect(() => {
        fetchSchemes();
        fetchSlides();

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

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);


    // --- FILTERING LOGIC ---
    const categories = useMemo(() => ["All", ...Array.from(new Set(schemes.map(item => item?.category).filter(Boolean)))], [schemes]);

    const filteredSchemes = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return schemes.filter((scheme) => {
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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory]);


    return (
        <div className="bg-gray-50 min-h-screen">
            {/* MAIN CONTENT */}
            <div className="max-w-[92rem] mx-auto px-3 md:px-4 py-8 md:py-16">
                
                {/* 1. CLEAN HEADER */}
                <div className='flex flex-col items-center text-center gap-2 md:gap-3 mb-8 md:mb-10'>
                    <h1 className='text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight'>
                        <SmartText ml="പ്രധാന ലിങ്കുകൾ">
                            Useful Links
                        </SmartText>
                    </h1>
                    <p className="text-gray-500 max-w-2xl text-sm md:text-base font-medium px-2">
                        Browse our collection of important resources, forms, and portals. Use the filters below to find exactly what you need.
                    </p>
                </div>

                {/* 2. SEARCH & FILTER STACK */}
                <div className="flex flex-col items-center gap-5 md:gap-6 mb-10 md:mb-12 w-full">
                    {/* Search Bar */}
                    <div className="w-full max-w-3xl px-1 md:px-0">
                        <Search onSearch={handleSearch} initialValue={searchQuery} />
                    </div>

                    {/* Category Pills - Scrollable on Mobile, Wrapped on Desktop */}
                    <div className="w-full flex overflow-x-auto no-scrollbar md:flex-wrap md:justify-center items-center gap-2 md:gap-3 pb-2 px-1 snap-x">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`snap-center whitespace-nowrap shrink-0 px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 border ${
                                    selectedCategory === cat 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                        
                        {/* Subtle Clear Button */}
                        {(searchQuery || selectedCategory !== "All") && (
                            <button
                                onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                                className="snap-center whitespace-nowrap shrink-0 ml-1 px-3 py-2 text-xs md:text-sm font-medium text-gray-400 hover:text-red-600 transition-colors underline underline-offset-4"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. GRID OF CARDS (Now 2-columns on mobile) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
                    {currentSchemes.length > 0 ? (
                        currentSchemes.map(scheme => (
                            <div key={scheme.id} className="w-full">
                                <SchemeCard
                                    image={scheme.image} 
                                    title={scheme.title}
                                    category={scheme.category}
                                    description={scheme.description}
                                    visitUrl={scheme.visitUrl}
                                    downloadUrl={scheme.downloadUrl}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 md:py-20 flex flex-col items-center justify-center text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mx-1 md:mx-0">
                            <p className="text-lg md:text-xl font-bold text-gray-700 mb-2">No resources found</p>
                            <p className="text-sm md:text-base text-gray-500 px-4">We couldn't find any links matching your search or category.</p>
                            <button 
                                onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                                className="mt-6 px-5 py-2 md:px-6 md:py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm md:text-base font-bold hover:bg-gray-100 transition shadow-sm"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>

                {/* 4. POLISHED PAGINATION */}
                {filteredSchemes.length > itemsPerPage && (
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-6 mt-12 md:mt-16 notranslate">
                        <div className="flex gap-3 order-2 sm:order-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-5 py-2 md:px-6 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-5 py-2 md:px-6 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200"
                            >
                                Next →
                            </button>
                        </div>

                        <div className='text-xs md:text-sm font-medium text-gray-500 order-1 sm:order-2 bg-gray-100 px-4 py-2 rounded-lg'>
                            <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> 
                            {" "}-{" "} 
                            <span className="text-gray-900 font-bold">{Math.min(indexOfFirstItem + itemsPerPage, filteredSchemes.length)}</span> 
                            {" "}of{" "} 
                            <span className="text-gray-900 font-bold">{filteredSchemes.length}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LandingPage