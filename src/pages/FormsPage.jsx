import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import { Search, Folder, Download, X, ArrowLeft, FileText } from 'lucide-react'; 

function FormsPage() {
    // 1. DATA STATE
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(true);

    // 2. UI STATE
    const [activeCategory, setActiveCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // --- FETCH & REAL-TIME LOGIC ---
    useEffect(() => {
        const fetchForms = async () => {
            const { data, error } = await supabase
                .from('schemes')
                // OPTIMIZATION 1: Only fetch exactly the columns this UI needs
                .select('id, category, title, description, downloadUrl')
                .eq('active', true)
                .eq('type', 'form')
                // OPTIMIZATION 2: Don't waste bandwidth downloading forms that have no PDF
                .not('downloadUrl', 'is', null) 
                .order('title', { ascending: true });

            if (error) console.error(error);
            else setSchemes(data || []);
            setLoading(false);
        };

        // Initial Load
        fetchForms();

        // Real-time Listener
        const channel = supabase
            .channel('forms-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'schemes' },
                () => fetchForms() // Refetch whenever a form is added/edited
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // --- DERIVED DATA ---
    const categories = useMemo(() => {
        const cats = schemes.map(s => s.category).filter(Boolean);
        return [...new Set(cats)].sort();
    }, [schemes]);

    // Helper: Count active forms per category (Simplified since DB already filtered empty URLs)
    const getCount = (cat) => schemes.filter(s => s.category === cat).length;

    // Filter Logic
    const currentList = schemes.filter(scheme => {
        const matchesSearch = scheme.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory ? scheme.category === activeCategory : true;
        return matchesSearch && matchesCategory;
    });

    const showListView = activeCategory || searchTerm.length > 0;

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
                        className="w-full pl-12 pr-4 py-3 rounded-xl shadow-sm border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-lg transition-shadow focus:shadow-md"
                    />
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />

                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* --- LOADING STATE --- */}
                {loading && (
                    <div className="text-center text-gray-500 py-12">Loading documents...</div>
                )}

                {!loading && (
                    <>
                        {/* --- VIEW 1: CATEGORY GRID --- */}
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
                                                <Folder size={24} />
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
                        {showListView && (
                            <div className="animate-fade-in-up">
                                {/* Header for List View */}
                                <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        {activeCategory && <Folder className="text-blue-500" size={20} />}
                                        {searchTerm
                                            ? `Search Results for "${searchTerm}"`
                                            : `${activeCategory} Documents`
                                        }
                                    </h2>

                                    <button
                                        onClick={() => { setActiveCategory(null); setSearchTerm(""); }}
                                        className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 font-medium"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to Categories
                                    </button>
                                </div>

                                {/* THE RESULTS LIST */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                                    {currentList.length > 0 ? (
                                        currentList.map(form => (
                                            <div key={form.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                                
                                                <div className="pr-4 flex-1">
                                                    {!activeCategory && (
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                                                            {form.category}
                                                        </span>
                                                    )}
                                                    <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                                        <FileText size={18} className="text-gray-400 group-hover:text-blue-500" />
                                                        {form.title}
                                                    </h4>
                                                    {form.description && (
                                                        <p className="text-xs text-gray-500 line-clamp-1 mt-1 ml-6">{form.description}</p>
                                                    )}
                                                </div>

                                                <a
                                                    href={form.downloadUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-600 hover:text-white transition-all flex-shrink-0"
                                                    title="Download PDF"
                                                >
                                                    <Download size={20} />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 text-center text-gray-400">
                                            <Search size={48} className="mx-auto mb-2 opacity-20" />
                                            <p>No forms found matching your search.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default FormsPage;