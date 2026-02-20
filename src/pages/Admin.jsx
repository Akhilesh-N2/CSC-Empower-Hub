import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UploadCloud, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, Search, Filter, Loader } from 'lucide-react';

// A placeholder image to use if the user doesn't upload one
const DEFAULT_IMAGE = "https://placehold.co/600x400/e2e8f0/1e293b?text=No+Image+Available";

const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) !== null;
};

// Removed props here - The component now manages its own data!
function Admin() {
    // --- 1. DATA STATE (Self-Contained) ---
    const [schemes, setSchemes] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([]);
    const [carouselSlides, setCarouselSlides] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- 2. ORIGINAL UI STATE ---
    const [pdfUploading, setPdfUploading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [slideImageUploading, setSlideImageUploading] = useState(false);
    const [isEditingSlide, setIsEditingSlide] = useState(false);
    const [posterUploading, setPosterUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'carousel' | 'jobs' | 'users' | 'posters'

    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- SEARCH & FILTER STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // --- STATE FOR POSTERS ---
    const [posterTitle, setPosterTitle] = useState('');
    const [posterImage, setPosterImage] = useState('');

    // --- STATE FOR JOBS (Loading state handled globally now, but keeping var for safety) ---
    const [jobsLoading, setJobsLoading] = useState(false);

    // --- 3. FETCH DATA FUNCTION (Replaces props) ---
    const fetchData = async () => {
        // Only set global loading on first load to prevent UI flickering on updates
        if (schemes.length === 0) setLoading(true);

        try {
            const [schemesData, jobsData, usersData, slidesData, catsData] = await Promise.all([
                supabase.from('schemes').select('*').order('created_at', { ascending: false }),
                supabase.from('jobs').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('slides').select('*').order('created_at', { ascending: false }),
                supabase.from('categories').select('*').order('name', { ascending: true })
            ]);

            if (schemesData.data) setSchemes(schemesData.data);
            if (jobsData.data) setJobs(jobsData.data);
            if (usersData.data) setUsers(usersData.data);
            if (slidesData.data) setCarouselSlides(slidesData.data);
            if (catsData.data) setCategories(catsData.data.map(c => c.name));

        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
            setJobsLoading(false);
        }
    };

    // --- 4. REAL-TIME LISTENER ---
    useEffect(() => {
        fetchData();

        const channel = supabase.channel('admin-dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                fetchData(); // Refresh data whenever DB changes
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Reset pagination when tab changes
    useEffect(() => {
        setSearchTerm('');
        setFilterCategory('');
        setCurrentPage(1);
    }, [activeTab]);

    // --- FILTER & PAGINATION LOGIC (Kept exactly as original) ---

    // 1. CONTENT FILTER
    const filteredContent = schemes.filter(s => {
        if (s.category === 'Poster') return false;
        const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === '' || s.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // 2. JOBS FILTER
    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 3. USERS FILTER
    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // PAGINATION SLICING
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredContent.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredContent.length / itemsPerPage);

    const indexOfLastJob = currentPage * itemsPerPage;
    const indexOfFirstJob = indexOfLastJob - itemsPerPage;
    const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
    const totalJobPages = Math.ceil(filteredJobs.length / itemsPerPage);

    const indexOfLastUser = currentPage * itemsPerPage;
    const indexOfFirstUser = indexOfLastUser - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);


    // --- ACTION HANDLERS ---

    // JOB ACTIONS
    const toggleJobStatus = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        // Optimistic update
        setJobs(jobs.map(j => j.id === id ? { ...j, is_active: newStatus } : j));

        await supabase.from('jobs').update({
            is_active: newStatus,
            admin_override: !newStatus
        }).eq('id', id);
        fetchData(); // Ensure sync
    };

    const deleteJob = async (id) => {
        if (!window.confirm("Are you sure you want to delete this job permanently?")) return;
        await supabase.from('jobs').delete().eq('id', id);
        fetchData();
    };

    // CATEGORY ACTIONS
    const [newCategoryInput, setNewCategoryInput] = useState("");

    const handleAddCategory = async () => {
        if (newCategoryInput.trim() !== "") {
            if (!categories.includes(newCategoryInput)) {
                try {
                    const { error } = await supabase.from('categories').insert([{ name: newCategoryInput }]);
                    if (error) throw error;
                    alert(`Category "${newCategoryInput}" added!`);
                    setNewCategoryInput("");
                    fetchData();
                } catch (error) {
                    alert("Error adding category: " + error.message);
                }
            } else {
                alert("Category already exists!");
            }
        }
    };

    const handleDeleteCategory = async () => {
        const categoryToDelete = currentScheme.category;
        if (!categoryToDelete) return alert("Please select a category first.");

        if (window.confirm(`Delete category "${categoryToDelete}" permanently?`)) {
            try {
                await supabase.from('categories').delete().eq('name', categoryToDelete);
                setCurrentScheme({ ...currentScheme, category: "" });
                fetchData();
            } catch (error) {
                alert("Error: " + error.message);
            }
        }
    };

    // CARDS (SCHEME) ACTIONS
    const [isEditing, setIsEditing] = useState(false);
    const [currentScheme, setCurrentScheme] = useState({
        id: null, title: '', category: '', type: 'scheme', description: '', image: '', visitUrl: '', downloadUrl: '', active: true
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentScheme({
            ...currentScheme,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Keep separate upload handlers as requested
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return alert("Please upload a PDF.");
        setPdfUploading(true);
        try {
            const fileName = `${Date.now()}-pdf-${file.name.replace(/\s/g, '_')}`;
            await supabase.storage.from('scheme-files').upload(fileName, file);
            const { data } = supabase.storage.from('scheme-files').getPublicUrl(fileName);
            setCurrentScheme(prev => ({ ...prev, downloadUrl: data.publicUrl }));
            alert("PDF Uploaded!");
        } catch (error) { alert(error.message); } finally { setPdfUploading(false); }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return alert("Please upload an image.");
        setImageUploading(true);
        try {
            const fileName = `${Date.now()}-img-${file.name.replace(/\s/g, '_')}`;
            await supabase.storage.from('scheme-files').upload(fileName, file);
            const { data } = supabase.storage.from('scheme-files').getPublicUrl(fileName);
            setCurrentScheme(prev => ({ ...prev, image: data.publicUrl }));
            alert("Image Uploaded!");
        } catch (error) { alert(error.message); } finally { setImageUploading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Basic Validation
        if (currentScheme.type === 'form' && !currentScheme.downloadUrl) {
            return alert("PDF is mandatory for downloadable forms.");
        }

        // 2. Create a clean data object WITHOUT the 'id' field
        // This object is used for both Insert and Update
        const schemeFields = {
            title: currentScheme.title,
            category: currentScheme.category,
            type: currentScheme.type,
            description: currentScheme.description,
            image: currentScheme.image || DEFAULT_IMAGE,
            visitUrl: currentScheme.visitUrl,
            downloadUrl: currentScheme.downloadUrl,
            active: currentScheme.active
        };

        try {
            if (isEditing) {
                // UPDATE logic
                const { error } = await supabase
                    .from('schemes')
                    .update(schemeFields)
                    .eq('id', currentScheme.id);

                if (error) throw error;
                alert("Item updated successfully!");
                setIsEditing(false);
            } else {
                // INSERT logic 
                // We pass [schemeFields] which strictly does NOT have an 'id' key
                const { error } = await supabase
                    .from('schemes')
                    .insert([schemeFields]); // Supabase will generate the ID automatically

                if (error) throw error;
                alert("New item added to database!");
            }

            // 3. Reset form and refresh UI
            setCurrentScheme({
                id: null, title: '', category: '', type: 'scheme',
                description: '', image: '', visitUrl: '',
                downloadUrl: '', active: true
            });
            fetchData();

        } catch (error) {
            console.error("Database Error details:", error);
            alert("Database Error: " + (error.details || error.message));
        }
    };

    const handleDeleteContent = async (id) => {
        if (!window.confirm("Permanently delete this item?")) return;
        await supabase.from('schemes').delete().eq('id', id);
        fetchData();
    };

    const toggleContentActive = async (id, currentStatus) => {
        await supabase.from('schemes').update({ active: !currentStatus }).eq('id', id);
        fetchData();
    };

    const handleEdit = (scheme) => {
        setCurrentScheme(scheme);
        setIsEditing(true);
    };

    // CAROUSEL ACTIONS
    const [currentSlide, setCurrentSlide] = useState({ id: null, title: '', description: '', image: '', link: '', duration: 5000, object_fit: 'cover' });

    const handleSlideInput = (e) => setCurrentSlide({ ...currentSlide, [e.target.name]: e.target.value });

    const handleSlideImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSlideImageUploading(true);
        try {
            const fileName = `slide-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
            await supabase.storage.from('carousel-bucket').upload(fileName, file);
            const { data } = supabase.storage.from('carousel-bucket').getPublicUrl(fileName);
            setCurrentSlide(prev => ({ ...prev, image: data.publicUrl }));
            alert("Media Uploaded!");
        } catch (error) { alert(error.message); } finally { setSlideImageUploading(false); }
    };

    const handleSlideSubmit = async (e) => {
        e.preventDefault();

        // Destructure to pull 'id' out for the update query
        const { id, ...slideData } = currentSlide;
        const finalData = {
            ...slideData,
            duration: parseInt(slideData.duration) || 5000
        };

        try {
            if (isEditingSlide) {
                const { error } = await supabase
                    .from('slides')
                    .update(finalData)
                    .eq('id', id);
                if (error) throw error;
                alert("Slide updated successfully!");
            } else {
                const { error } = await supabase
                    .from('slides')
                    .insert([finalData]);
                if (error) throw error;
                alert("Slide added successfully!");
            }

            cancelSlideEdit();
            fetchData();
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const deleteSlide = async (id) => {
        if (window.confirm("Delete this slide?")) {
            await supabase.from('slides').delete().eq('id', id);
            fetchData();
        }
    };

    const handleEditSlide = (slide) => {
        setCurrentSlide(slide);
        setIsEditingSlide(true);
        // Smooth scroll back to the top of the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelSlideEdit = () => {
        setIsEditingSlide(false);
        setCurrentSlide({ id: null, title: '', description: '', image: '', link: '', duration: 5000, object_fit: 'cover' });
    };

    // USER ACTIONS
    const toggleUserApproval = async (id, currentStatus) => {
        // Optimistic UI update
        setUsers(users.map(u => u.id === id ? { ...u, is_approved: !currentStatus } : u));
        await supabase.from('profiles').update({ is_approved: !currentStatus }).eq('id', id);
    };

    const handleDeleteUser = async (id, email) => {
        if (!window.confirm(`Delete user ${email}?`)) return;
        await supabase.from('profiles').delete().eq('id', id);
        fetchData();
    };

    // POSTER ACTIONS
    const handlePosterUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPosterUploading(true);
        try {
            const fileName = `poster-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
            await supabase.storage.from('scheme-files').upload(fileName, file);
            const { data } = supabase.storage.from('scheme-files').getPublicUrl(fileName);
            setPosterImage(data.publicUrl);
        } catch (error) { alert("Upload failed: " + error.message); } finally { setPosterUploading(false); }
    };

    const handlePosterSubmit = async (e) => {
        e.preventDefault();
        if (!posterImage) return alert("Please upload an image.");
        await supabase.from('schemes').insert([{
            title: posterTitle,
            category: 'Poster',
            type: 'scheme',
            image: posterImage,
            active: true,
            description: 'Awareness Poster'
        }]);
        alert("Poster published!");
        setPosterTitle(''); setPosterImage('');
        fetchData();
    };


    // --- RENDER (Original Layout preserved) ---
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">

            {/* RESPONSIVE NAV */}
            <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
                <div className="p-4 md:p-6 text-xl md:text-2xl font-bold border-b border-slate-700 flex justify-between items-center">
                    <span>Admin Panel</span>
                </div>

                <nav className="flex flex-row md:flex-col p-2 md:p-4 gap-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('cards')} className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}>📑 Manage Content</button>
                    <button onClick={() => setActiveTab('carousel')} className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'carousel' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}>🖼️ Manage Carousel</button>
                    <button onClick={() => setActiveTab('jobs')} className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'jobs' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}>💼 Manage Jobs</button>
                    <button onClick={() => setActiveTab('users')} className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}>👥 Manage Users</button>
                    <button onClick={() => setActiveTab('posters')} className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'posters' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}>📢 Posters</button>
                </nav>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto">

                {loading ? (
                    <div className="flex h-full items-center justify-center text-gray-500">
                        <Loader className="animate-spin mr-2" /> Loading Dashboard...
                    </div>
                ) : (
                    <>
                        {/* --- TAB 1: CONTENT CARDS --- */}
                        {activeTab === 'cards' && (
                            <div className="max-w-5xl mx-auto">
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Content Management</h2>

                                {/* FORM SECTION */}
                                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                                    <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-700">{isEditing ? 'Edit Item' : 'Add New Item'}</h3>
                                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                                        <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <label className="block text-sm font-bold text-blue-800 mb-2">Display Type</label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                                                    <input type="radio" name="type" value="scheme" checked={currentScheme.type === 'scheme'} onChange={handleInputChange} className="w-5 h-5 text-blue-600" />
                                                    <div>
                                                        <span className="block font-medium text-gray-800">Useful Links</span>
                                                        <span className="block text-xs text-gray-500">(Home Page)</span>
                                                    </div>
                                                </label>
                                                <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                                                    <input type="radio" name="type" value="form" checked={currentScheme.type === 'form'} onChange={handleInputChange} className="w-5 h-5 text-blue-600" />
                                                    <div>
                                                        <span className="block font-medium text-gray-800">Downloadable Form</span>
                                                        <span className="block text-xs text-gray-500">(Forms Library)</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                            <input type="text" name="title" required value={currentScheme.title} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                            <div className="flex gap-2 mb-2">
                                                <select name="category" required value={currentScheme.category} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg bg-white">
                                                    <option value="">Select Category</option>
                                                    {categories.map((cat, index) => <option key={index} value={cat}>{cat}</option>)}
                                                </select>
                                                <button type="button" onClick={handleDeleteCategory} className="bg-red-100 text-red-600 px-3 rounded-lg border border-red-200">🗑️</button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="New Category" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} className="flex-1 p-2 border border-gray-300 rounded-lg text-sm" />
                                                <button type="button" onClick={handleAddCategory} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap">+ Add</button>
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <textarea name="description" rows="3" value={currentScheme.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                                        </div>

                                        {currentScheme.type === 'scheme' && (
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Scheme Image</label>
                                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                                    <div className="w-full">
                                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                                        {imageUploading && <span className="text-sm text-blue-600 animate-pulse">⏳ Uploading...</span>}
                                                    </div>
                                                    {currentScheme.image && <img src={currentScheme.image} alt="Preview" className="w-16 h-16 rounded border object-cover" />}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Visit Link</label>
                                            <input type="url" name="visitUrl" value={currentScheme.visitUrl} onChange={handleInputChange} className="w-full p-2 border rounded-lg outline-none" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF {currentScheme.type === 'form' && <span className="text-red-500">*</span>}</label>
                                            <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                            {pdfUploading && <span className="text-sm text-blue-600 animate-pulse">⏳ Uploading...</span>}
                                            {currentScheme.downloadUrl && <div className="text-xs text-green-700 mt-1 break-all">✓ Attached</div>}
                                        </div>

                                        <div className="col-span-1 md:col-span-2 flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                            <input type="checkbox" name="active" checked={currentScheme.active} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
                                            <label className="text-gray-700 font-medium">Make this active immediately?</label>
                                        </div>

                                        <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
                                            <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{isEditing ? 'Update Item' : 'Add Item'}</button>
                                            {isEditing && <button type="button" onClick={() => { setIsEditing(false); setCurrentScheme({ id: null, title: '', category: '', type: 'scheme', description: '', image: '', visitUrl: '', downloadUrl: '', active: true }); }} className="w-full sm:w-auto px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium">Cancel</button>}
                                        </div>
                                    </form>
                                </div>

                                {/* SEARCH & FILTER BAR */}
                                <div className="flex flex-col md:flex-row gap-4 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                        <input type="text" placeholder="Search by Title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="relative md:w-1/3">
                                        <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none">
                                            <option value="">All Categories</option>
                                            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* LIST SECTION */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-bold"><tr><th className="p-4">Type</th><th className="p-4">Title</th><th className="p-4">Category</th><th className="p-4">Actions</th></tr></thead>
                                            <tbody>
                                                {currentItems.map(s => (
                                                    <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${s.type === 'form' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{s.type ? s.type.toUpperCase() : 'SCHEME'}</span></td>
                                                        <td className="p-4 font-medium text-gray-900">{s.title}</td>
                                                        <td className="p-4 text-gray-600">{s.category}</td>
                                                        <td className="p-4 flex gap-2">
                                                            <button onClick={() => toggleContentActive(s.id, s.active)} className={`px-3 py-1 rounded-full text-xs font-bold ${s.active ? 'bg-green-100 text-green-700 hover:bg-green-300' : 'bg-red-100 text-red-700 hover:bg-red-300'}`}>{s.active ? 'ACTIVE' : 'INACTIVE'}</button>
                                                            <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Edit</button>
                                                            <button onClick={() => handleDeleteContent(s.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredContent.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-500">No content found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Pagination (Preserved) */}
                                    {filteredContent.length > itemsPerPage && (
                                        <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
                                            <span className="text-xs text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"><ChevronLeft size={16} /></button>
                                                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"><ChevronRight size={16} /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- TAB 2: CAROUSEL --- */}
                        {activeTab === 'carousel' && (
                            <div className="max-w-4xl mx-auto">
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Carousel Manager</h2>
                                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Add New Slide</h3>
                                    <form onSubmit={handleSlideSubmit} className="grid grid-cols-1 gap-4">
                                        <input type="text" name="title" placeholder="Slide Title" required value={currentSlide.title} onChange={handleSlideInput} className="p-2 border rounded-lg w-full" />
                                        <input type="text" name="description" placeholder="Short Description (Optional)" value={currentSlide.description} onChange={handleSlideInput} className="p-2 border rounded-lg w-full" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Slide Image (Optional)</label>
                                                <input type="file" accept="image/*, video/*" onChange={handleSlideImageUpload} className="block w-full text-sm text-gray-500" />
                                                {slideImageUploading && <p className="text-sm text-blue-600 mt-2 animate-pulse">Uploading...</p>}
                                                {currentSlide.image && (
                                                    <div className="mt-2">
                                                        <p className="text-xs text-green-600 mb-1">✓ Media Attached</p>
                                                        {isVideo(currentSlide.image) ? (
                                                            <video src={currentSlide.image} className={`h-20 rounded border ${currentSlide.object_fit === 'contain' ? 'object-contain bg-black' : 'object-cover'}`} muted autoPlay loop />
                                                        ) : (
                                                            <img src={currentSlide.image} alt="Preview" className={`h-20 rounded border ${currentSlide.object_fit === 'contain' ? 'object-contain bg-black' : 'object-cover'}`} />
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* CROP CONTROL DROPDOWN */}
                                            <div className="flex flex-col justify-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <label className="block text-sm font-bold text-blue-800 mb-2">Image Scaling</label>
                                                <select
                                                    name="object_fit"
                                                    value={currentSlide.object_fit}
                                                    onChange={handleSlideInput}
                                                    className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="cover">Crop to Fill (Cover)</option>
                                                    <option value="contain">Show Whole Image (Contain)</option>
                                                </select>
                                                <p className="text-[10px] text-blue-600 mt-2 italic">* Use 'Show Whole' for posters or images with important text on the edges.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <input name="link" placeholder="Link (Optional)" value={currentSlide.link} onChange={handleSlideInput} className="p-2 border rounded w-full" />
                                            <div className="flex items-center gap-2">
                                                <input type="number" name="duration" placeholder="5000" value={currentSlide.duration} onChange={handleSlideInput} className="p-2 border rounded w-full" min="1000" step="500" />
                                                <span className="text-sm text-gray-500">ms</span>
                                            </div>
                                        </div>
                                        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 w-full sm:w-fit font-bold">Add Slide</button>
                                    </form>
                                </div>

                                {/* PREVIEW GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {carouselSlides.map(s => (
                                        <div key={s.id} className="relative group rounded-xl overflow-hidden shadow h-48 bg-slate-200 border border-gray-300">
                                            {isVideo(s.image) ? (
                                                <video
                                                    src={s.image}
                                                    className={`w-full h-full ${s.object_fit === 'contain' ? 'object-contain bg-black' : 'object-cover'}`}
                                                    muted autoPlay loop playsInline
                                                />
                                            ) : (
                                                <img
                                                    src={s.image}
                                                    className={`w-full h-full ${s.object_fit === 'contain' ? 'object-contain bg-black' : 'object-cover'}`}
                                                    alt="Slide"
                                                />
                                            )}

                                            {/* Label for Scaling Type */}
                                            <div className="absolute top-2 left-2 z-10">
                                                <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm border border-white/20">
                                                    {s.object_fit === 'contain' ? 'Whole' : 'Cropped'}
                                                </span>
                                            </div>

                                            {/* ACTION BUTTONS (TOP RIGHT) */}
                                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <button
                                                    onClick={() => handleEditSlide(s)}
                                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg"
                                                    title="Edit Slide"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => deleteSlide(s.id)}
                                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                                                    title="Delete Slide"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent text-white w-full p-4">
                                                <p className="font-bold truncate text-sm">{s.title || "Untitled"}</p>
                                                <p className="text-[10px] text-gray-300">Duration: {s.duration}ms</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- TAB 3: JOBS --- */}
                        {activeTab === 'jobs' && (
                            <div className="max-w-6xl mx-auto">
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Job Management</h2>
                                <div className="mb-4 relative">
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input type="text" placeholder="Search by Job Title or Company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                                                <tr><th className="p-4 font-semibold">Job Role</th><th className="p-4 font-semibold">Company</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Actions</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {currentJobs.map((job) => (
                                                    <tr key={job.id} className="hover:bg-gray-50 transition">
                                                        <td className="p-4"><div className="font-bold text-gray-800">{job.title}</div></td>
                                                        <td className="p-4 text-gray-600">{job.company}</td>
                                                        <td className="p-4"><button onClick={() => toggleJobStatus(job.id, job.is_active)} className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${job.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>{job.is_active ? "Active" : "Disabled"}</button></td>
                                                        <td className="p-4 text-right space-x-2">
                                                            <button onClick={() => toggleJobStatus(job.id, job.is_active)} className="p-2 text-gray-400 hover:text-blue-600 transition">{job.is_active ? '👁️' : '🚫'}</button>
                                                            <button onClick={() => deleteJob(job.id)} className="p-2 text-gray-400 hover:text-red-600 transition">🗑️</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredJobs.length > itemsPerPage && (
                                        <div className="flex justify-between items-center p-4">
                                            <div className="flex gap-3 items-center">
                                                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-1 border rounded bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
                                                <span className="text-xs text-gray-500">Page {currentPage} of {totalJobPages}</span>
                                                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalJobPages} className="p-1 border rounded bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- TAB 4: USERS --- */}
                        {activeTab === 'users' && (
                            <div className="max-w-6xl mx-auto">
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">User Approvals</h2>
                                <div className="mb-4 relative">
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input type="text" placeholder="Search by Email or Role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="bg-white rounded-xl shadow border overflow-hidden">
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead className="bg-gray-50 border-b"><tr><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-center">Actions</th></tr></thead>
                                            <tbody>
                                                {currentUsers.map(user => (
                                                    <tr key={user.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-4 font-medium">{user.email}</td>
                                                        <td className="p-4 capitalize"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'provider' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
                                                        <td className="p-4">{user.is_approved ? <span className="text-green-600 font-bold text-sm">✓ Active</span> : <span className="text-orange-500 font-bold text-sm">⏳ Pending</span>}</td>
                                                        <td className="p-4 flex justify-center gap-3">
                                                            <button onClick={() => toggleUserApproval(user.id, user.is_approved)} className={`px-4 py-2 rounded text-sm font-bold text-white transition ${user.is_approved ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}>{user.is_approved ? 'Block' : 'Approve'}</button>
                                                            <button onClick={() => handleDeleteUser(user.id, user.email)} className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 transition">🗑️ Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredUsers.length > itemsPerPage && (
                                        <div className="flex justify-between items-center p-4">
                                            <div className="flex gap-3 items-center">
                                                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-1 border rounded bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
                                                <span className="text-xs text-gray-500">Page {currentPage} of {totalUserPages}</span>
                                                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalUserPages} className="p-1 border rounded bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- TAB 5: POSTERS --- */}
                        {activeTab === 'posters' && (
                            <div className="max-w-6xl mx-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Poster Manager</h2>
                                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border">Total Posters: {schemes.filter(i => i.category === 'Poster').length}</span>
                                </div>
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-10">
                                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><UploadCloud size={24} className="text-blue-600" /> Upload New Poster</h3>
                                    <form onSubmit={handlePosterSubmit} className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Poster Title</label>
                                                <input type="text" value={posterTitle} onChange={(e) => setPosterTitle(e.target.value)} placeholder="e.g. Free Eye Camp Notice" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <button type="submit" disabled={posterUploading || !posterImage} className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all ${posterUploading || !posterImage ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{posterUploading ? 'Uploading...' : '🚀 Publish Poster'}</button>
                                        </div>
                                        <div className="flex-1">
                                            <div className={`relative border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center text-center transition-all ${posterImage ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                                                <input type="file" accept="image/*" onChange={handlePosterUpload} disabled={posterUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                {posterUploading ? (<div className="animate-pulse text-blue-600 font-bold">Uploading...</div>) : posterImage ? (<img src={posterImage} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />) : (<div className="p-4"><UploadCloud size={32} className="mx-auto text-gray-400 mb-2" /><p className="text-gray-900 font-bold text-sm">Click to upload image</p><p className="text-xs text-gray-500">SVG, PNG, JPG</p></div>)}
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {schemes.filter(item => item.category === 'Poster').map(poster => (
                                        <div key={poster.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full">
                                            <div className="relative h-48 bg-gray-100 overflow-hidden"><img src={poster.image} alt={poster.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /><div className="absolute top-2 right-2"><span className={`px-2 py-1 text-xs font-bold rounded-full border shadow-sm ${poster.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{poster.active ? 'Active' : 'Hidden'}</span></div></div>
                                            <div className="p-4 flex flex-col flex-1"><h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1" title={poster.title}>{poster.title}</h4><p className="text-xs text-gray-400 mb-4">Added: {new Date(poster.created_at).toLocaleDateString()}</p><div className="mt-auto flex gap-2"><button onClick={() => toggleContentActive(poster.id, poster.active)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition ${poster.active ? 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-red-600' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}>{poster.active ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Publish</>}</button><button onClick={() => handleDeleteContent(poster.id)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 rounded-lg transition" title="Delete Permanently"><Trash2 size={16} /></button></div></div>
                                        </div>
                                    ))}
                                    {schemes.filter(item => item.category === 'Poster').length === 0 && (<div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-400">No posters uploaded yet.</p></div>)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Admin;