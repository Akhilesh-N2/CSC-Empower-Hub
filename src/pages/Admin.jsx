import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

// A placeholder image to use if the user doesn't upload one
const DEFAULT_IMAGE = "https://placehold.co/600x400/e2e8f0/1e293b?text=No+Image+Available";

const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) !== null;
};

// Note: added 'refreshCategories' to the props list
function Admin({ schemes, setSchemes, carouselSlides, setCarouselSlides, categories, setCategories, refreshSchemes, refreshSlides, refreshCategories }) {
    const [pdfUploading, setPdfUploading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [slideImageUploading, setSlideImageUploading] = useState(false); // for image uploading
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'carousel' | 'jobs'

    // --- STATE FOR JOBS ---
    const [jobs, setJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(true);

    // --- FETCH JOBS ---
    const fetchJobs = async () => {
        setJobsLoading(true);
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching jobs:', error);
        else setJobs(data || []);
        setJobsLoading(false);
    };

    // Fetch jobs on component mount
    useEffect(() => {
        fetchJobs();
    }, []);

    // --- JOB ACTIONS ---
    const toggleJobStatus = async (id, currentStatus) => {
        // 1. Optimistic UI Update
        setJobs(jobs.map(job =>
            job.id === id ? { ...job, is_active: !currentStatus } : job
        ));

        // 2. Update Supabase
        const { error } = await supabase
            .from('jobs')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) {
            alert("Failed to update status");
            fetchJobs(); // Revert on error
        }
    };

    const deleteJob = async (id) => {
        if (!window.confirm("Are you sure you want to delete this job permanently?")) return;

        const { error } = await supabase.from('jobs').delete().eq('id', id);

        if (error) {
            alert("Error deleting job: " + error.message);
        } else {
            setJobs(jobs.filter(job => job.id !== id));
        }
    };

    // --- STATE FOR CATEGORY (UPDATED FOR CLOUD) ---
    const [newCategoryInput, setNewCategoryInput] = useState("");

    const handleAddCategory = async () => {
        if (newCategoryInput.trim() !== "") {
            // Check if it already exists in the list passed from App.jsx
            if (!categories.includes(newCategoryInput)) {
                try {
                    // 1. Send to Supabase
                    const { error } = await supabase
                        .from('categories')
                        .insert([{ name: newCategoryInput }]);

                    if (error) throw error;

                    // 2. Success
                    alert(`Category "${newCategoryInput}" added to Cloud!`);
                    refreshCategories(); // Update App.jsx list
                    setNewCategoryInput("");
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
        if (!categoryToDelete || categoryToDelete === "") {
            alert("Please select a category from the dropdown first to delete it.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete the category "${categoryToDelete}" permanently?`)) {
            try {
                // 1. Delete from Supabase
                const { error } = await supabase
                    .from('categories')
                    .delete()
                    .eq('name', categoryToDelete);

                if (error) throw error;

                // 2. Success
                refreshCategories(); // Update App.jsx list
                setCurrentScheme({ ...currentScheme, category: "" });
            } catch (error) {
                alert("Error deleting category: " + error.message);
            }
        }
    };

    // --- STATE FOR CARDS ---
    const [isEditing, setIsEditing] = useState(false);
    const [currentScheme, setCurrentScheme] = useState({
        id: null,
        title: '',
        category: '',
        type: 'scheme',
        description: '',
        image: '',
        visitUrl: '',
        downloadUrl: '',
        active: true
    });

    // --- CARD FUNCTIONS ---
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentScheme({
            ...currentScheme,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // 1. PDF UPLOAD HANDLER
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert("Please upload a PDF file.");
            return;
        }

        setPdfUploading(true);
        try {
            const fileName = `${Date.now()}-pdf-${file.name.replace(/\s/g, '_')}`;
            const { error } = await supabase.storage.from('scheme-files').upload(fileName, file);
            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from('scheme-files').getPublicUrl(fileName);
            setCurrentScheme(prev => ({ ...prev, downloadUrl: publicUrlData.publicUrl }));
            alert("PDF Uploaded Successfully!");
        } catch (error) {
            console.error("Error uploading PDF:", error.message);
            alert("Failed to upload PDF: " + error.message);
        } finally {
            setPdfUploading(false);
        }
    };

    // 2. IMAGE UPLOAD HANDLER
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert("Please upload a valid image file (JPG, PNG, etc).");
            return;
        }

        setImageUploading(true);
        try {
            const fileName = `${Date.now()}-img-${file.name.replace(/\s/g, '_')}`;
            const { error } = await supabase.storage.from('scheme-files').upload(fileName, file);
            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from('scheme-files').getPublicUrl(fileName);
            setCurrentScheme(prev => ({ ...prev, image: publicUrlData.publicUrl }));
            alert("Image Uploaded Successfully!");
        } catch (error) {
            console.error("Error uploading Image:", error.message);
            alert("Failed to upload Image: " + error.message);
        } finally {
            setImageUploading(false);
        }
    };

    // --- DATABASE ACTIONS ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (currentScheme.type === 'form' && !currentScheme.downloadUrl) {
            alert("You selected 'Downloadable Form', so uploading a PDF is MANDATORY.");
            return;
        }

        const schemeData = {
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
                const { error } = await supabase.from('schemes').update(schemeData).eq('id', currentScheme.id);
                if (error) throw error;
                alert("Item updated successfully!");
                setIsEditing(false);
            } else {
                const { error } = await supabase.from('schemes').insert([schemeData]);
                if (error) throw error;
                alert("New item added to database!");
            }
            refreshSchemes();
            setCurrentScheme({ id: null, title: '', category: '', type: 'scheme', description: '', image: '', visitUrl: '', downloadUrl: '', active: true });
        } catch (error) {
            alert("Error saving: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item? This will also delete any attached files.")) return;
        try {
            const { data: schemeData, error: fetchError } = await supabase.from('schemes').select('downloadUrl, image').eq('id', id).single();
            if (fetchError) throw fetchError;

            const filesToDelete = [];
            if (schemeData?.downloadUrl && schemeData.downloadUrl.includes('supabase.co')) {
                filesToDelete.push(schemeData.downloadUrl.split('/').pop());
            }
            if (schemeData?.image && schemeData.image.includes('supabase.co')) {
                filesToDelete.push(schemeData.image.split('/').pop());
            }

            if (filesToDelete.length > 0) {
                await supabase.storage.from('scheme-files').remove(filesToDelete);
            }

            const { error: deleteError } = await supabase.from('schemes').delete().eq('id', id);
            if (deleteError) throw deleteError;
            refreshSchemes();
        } catch (error) {
            alert("Error deleting: " + error.message);
        }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            const { error } = await supabase.from('schemes').update({ active: !currentStatus }).eq('id', id);
            if (error) throw error;
            refreshSchemes();
        } catch (error) {
            console.error("Error updating status:", error.message);
        }
    };

    const handleEdit = (scheme) => {
        setCurrentScheme(scheme);
        setIsEditing(true);
    };

    // --- CAROUSEL FUNCTIONS ---
    const [currentSlide, setCurrentSlide] = useState({ id: null, title: '', description: '', image: '', link: '', duration: 5000, object_fit: 'cover' });
    const handleSlideInput = (e) => setCurrentSlide({ ...currentSlide, [e.target.name]: e.target.value });

    const handleSlideImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert("Please upload an Image or Video file.");
            return;
        }

        setSlideImageUploading(true);
        try {
            const fileName = `slide-${Date.now()}-${file.name.replace(/\s/g, '_')}`;

            // Upload to 'carousel-bucket'
            const { error } = await supabase.storage.from('carousel-bucket').upload(fileName, file);
            if (error) throw error;

            const { data } = supabase.storage.from('carousel-bucket').getPublicUrl(fileName);
            setCurrentSlide(prev => ({ ...prev, image: data.publicUrl }));
            alert("Media Uploaded!");
        } catch (error) { alert(error.message); } finally { setSlideImageUploading(false); }
    };

    const handleSlideSubmit = async (e) => {
        e.preventDefault();
        const slideData = {
            title: currentSlide.title || "Untitled",
            description: currentSlide.description,
            image: currentSlide.image,
            link: currentSlide.link,
            duration: parseInt(currentSlide.duration) || 5000,
            object_fit: currentSlide.object_fit || 'cover'
        };

        const { error } = await supabase.from('slides').insert([slideData]);

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Slide Added!");
            refreshSlides();
            setCurrentSlide({ id: null, title: '', description: '', image: '', link: '', duration: 5000, object_fit: 'cover' });
        }
    };

    const deleteSlide = async (id) => {
        if (window.confirm("Delete this slide?")) {
            const { data: slideData } = await supabase.from('slides').select('image').eq('id', id).single();
            if (slideData?.image && slideData.image.includes('carousel-bucket')) {
                const fileName = slideData.image.split('/').pop();
                await supabase.storage.from('carousel-bucket').remove([fileName]);
            }
            const { error } = await supabase.from('slides').delete().eq('id', id);
            if (error) alert(error.message); else refreshSlides();
        }
    };


    // --- STATE FOR USERS ---
    const [users, setUsers] = useState([]);
    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false }); // Newest first
        if (!error) setUsers(data);
    };

    // Toggle Approval
    const toggleUserApproval = async (id, currentStatus) => {
        // Optimistic UI Update
        setUsers(users.map(u => u.id === id ? { ...u, is_approved: !currentStatus } : u));

        // DB Update
        await supabase.from('profiles').update({ is_approved: !currentStatus }).eq('id', id);
    };

    // Load users when tab opens
    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
    }, [activeTab]);

    return (
        // 1. RESPONSIVE CONTAINER
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">

            {/* 2. RESPONSIVE NAV */}
            <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
                <div className="p-4 md:p-6 text-xl md:text-2xl font-bold border-b border-slate-700 flex justify-between items-center">
                    <span>Admin Panel</span>
                </div>

                <nav className="flex flex-row md:flex-col p-2 md:p-4 gap-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('cards')}
                        className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}
                    >
                        📑 Manage Content
                    </button>
                    <button
                        onClick={() => setActiveTab('carousel')}
                        className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'carousel' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}
                    >
                        🖼️ Manage Carousel
                    </button>
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'jobs' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}
                    >
                        💼 Manage Jobs
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`whitespace-nowrap flex-1 text-center md:text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}
                    >
                        👥 Manage Users</button>
                </nav>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto">

                {/* --- TAB 1: CONTENT CARDS --- */}
                {activeTab === 'cards' && (
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Content Management</h2>

                        {/* FORM SECTION */}
                        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                            <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-700">{isEditing ? 'Edit Item' : 'Add New Item'}</h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                                {/* DISPLAY TYPE */}
                                <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <label className="block text-sm font-bold text-blue-800 mb-2">Display Type</label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                                            <input
                                                type="radio" name="type" value="scheme"
                                                checked={currentScheme.type === 'scheme'}
                                                onChange={handleInputChange}
                                                className="w-5 h-5 text-blue-600"
                                            />
                                            <div>
                                                <span className="block font-medium text-gray-800">Useful Links</span>
                                                <span className="block text-xs text-gray-500">(Home Page)</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                                            <input
                                                type="radio" name="type" value="form"
                                                checked={currentScheme.type === 'form'}
                                                onChange={handleInputChange}
                                                className="w-5 h-5 text-blue-600"
                                            />
                                            <div>
                                                <span className="block font-medium text-gray-800">Downloadable Form</span>
                                                <span className="block text-xs text-gray-500">(Forms Library)</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="col-span-1 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input type="text" name="title" required value={currentScheme.title} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>

                                {/* Category */}
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

                                {/* Description */}
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea name="description" rows="3" value={currentScheme.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                                </div>

                                {/* Image Upload */}
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

                                {/* Links & PDF */}
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

                                {/* Active Toggle */}
                                <div className="col-span-1 md:col-span-2 flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                    <input type="checkbox" name="active" checked={currentScheme.active} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
                                    <label className="text-gray-700 font-medium">Make this active immediately?</label>
                                </div>

                                {/* Buttons */}
                                <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
                                    <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{isEditing ? 'Update Item' : 'Add Item'}</button>
                                    {isEditing && <button type="button" onClick={() => { setIsEditing(false); setCurrentScheme({ id: null, title: '', category: '', type: 'scheme', description: '', image: '', visitUrl: '', downloadUrl: '', active: true }); }} className="w-full sm:w-auto px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium">Cancel</button>}
                                </div>
                            </form>
                        </div>

                        {/* LIST SECTION */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-bold">
                                        <tr>
                                            <th className="p-4 border-b">Type</th>
                                            <th className="p-4 border-b">Status</th>
                                            <th className="p-4 border-b">Title</th>
                                            <th className="p-4 border-b">Category</th>
                                            <th className="p-4 border-b text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {schemes.map((scheme) => (
                                            <tr key={scheme.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scheme.type === 'form' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {scheme.type ? scheme.type.toUpperCase() : 'SCHEME'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <button onClick={() => toggleActive(scheme.id, scheme.active)} className={`px-3 py-1 rounded-full text-xs font-bold ${scheme.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {scheme.active ? 'ACTIVE' : 'INACTIVE'}
                                                    </button>
                                                </td>
                                                <td className="p-4 font-medium text-gray-900">{scheme.title}</td>
                                                <td className="p-4 text-gray-600">{scheme.category}</td>
                                                <td className="p-4 flex justify-center gap-3">
                                                    <button onClick={() => handleEdit(scheme)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Edit</button>
                                                    <button onClick={() => handleDelete(scheme.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {schemes.length === 0 && (
                                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">No content added yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: CAROUSEL MANAGEMENT --- */}
                {activeTab === 'carousel' && (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Carousel Manager</h2>
                        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                            <h3 className="text-lg font-semibold mb-4 text-gray-700">Add New Slide</h3>
                            <form onSubmit={handleSlideSubmit} className="grid grid-cols-1 gap-4">

                                {/* Title */}
                                <input type="text" name="title" placeholder="Slide Title" required value={currentSlide.title} onChange={handleSlideInput} className="p-2 border rounded-lg w-full" />
                                {/* Desc */}
                                <input type="text" name="description" placeholder="Short Description (Optional)" value={currentSlide.description} onChange={handleSlideInput} className="p-2 border rounded-lg w-full" />

                                {/* Image */}
                                <div className="border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Slide Image (Optional)</label>
                                    <input
                                        type="file"
                                        accept="image/*, video/*"
                                        onChange={handleSlideImageUpload}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                    />
                                    {slideImageUploading && <p className="text-sm text-blue-600 mt-2 animate-pulse">Uploading...</p>}
                                    {currentSlide.image && (
                                        <div className="mt-2">
                                            <p className="text-xs text-green-600 mb-1">✓ Image Attached</p>
                                            {isVideo(currentSlide.image) ? (
                                                <video src={currentSlide.image} className="h-20 rounded border" muted autoPlay loop />
                                            ) : (
                                                <img src={currentSlide.image} alt="Preview" className="h-20 rounded border" />
                                            )}
                                        </div>
                                    )}
                                </div>


                                {/* Duration settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="link" placeholder="Link (Optional)" value={currentSlide.link} onChange={handleSlideInput} className="p-2 border rounded w-full" />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            name="duration"
                                            placeholder="5000"
                                            value={currentSlide.duration}
                                            onChange={handleSlideInput}
                                            className="p-2 border rounded w-full"
                                            min="1000"
                                            step="500"
                                        />
                                        <span className="text-sm text-gray-500">ms</span>
                                    </div>
                                    {/* ccarousel sizing */}
                                    <select
                                        name="object_fit"
                                        value={currentSlide.object_fit}
                                        onChange={handleSlideInput}
                                        className="p-2 border rounded w-full bg-white"
                                    >
                                        <option value="cover">Fill Area (Crop)</option>
                                        <option value="contain">Show Full (No Crop)</option>
                                    </select>
                                </div>


                                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 w-full sm:w-fit">Add Slide</button>
                            </form>
                        </div>

                        {/* LIST */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {carouselSlides.map(s => (
                                <div key={s.id} className="relative group rounded-xl overflow-hidden shadow h-48 bg-black">
                                    {isVideo(s.image) ? (
                                        <video
                                            src={s.image}
                                            className={`w-full h-full ${s.object_fit === 'contain' ? 'object-contain' : 'object-cover'} opacity-90`}
                                            muted
                                            autoPlay
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <img
                                            src={s.image}
                                            className={`w-full h-full ${s.object_fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                                            alt="Slide"
                                        />
                                    )}

                                    <div className="absolute bottom-0 left-0 bg-black/60 text-white w-full p-2 flex justify-between">
                                        <p className="font-bold truncate w-2/3">{s.title || "Untitled"}</p>
                                        <div className="text-right">
                                            <p className="text-xs opacity-80">{s.duration || 5000}ms</p>
                                            <p className="text-[10px] uppercase opacity-60">{s.object_fit || 'cover'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteSlide(s.id)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded">🗑️</button>
                                </div>
                            ))}
                        </div>

                    </div>
                )}

                {/* --- TAB 3: JOB MANAGEMENT (NEW) --- */}
                {activeTab === 'jobs' && (
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Job Management</h2>
                            {/* Link to the Post Job page you created earlier */}
                            <Link to="/post-job" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                                + Post New Job
                            </Link>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {jobsLoading ? (
                                <div className="p-10 text-center text-gray-500">Loading jobs...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                                            <tr>
                                                <th className="p-4 font-semibold">Job Role</th>
                                                <th className="p-4 font-semibold">Company</th>
                                                <th className="p-4 font-semibold">Posted</th>
                                                <th className="p-4 font-semibold">Status</th>
                                                <th className="p-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {jobs.map((job) => (
                                                <tr key={job.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-800">{job.title}</div>
                                                    </td>
                                                    <td className="p-4 text-gray-600">
                                                        {job.company}
                                                    </td>
                                                    <td className="p-4 text-gray-500 text-sm">
                                                        {new Date(job.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => toggleJobStatus(job.id, job.is_active)}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${job.is_active
                                                                ? "bg-green-100 text-green-700 border-green-200"
                                                                : "bg-gray-100 text-gray-500 border-gray-200"
                                                                }`}
                                                        >
                                                            {job.is_active ? "Active" : "Disabled"}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => toggleJobStatus(job.id, job.is_active)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 transition"
                                                            title={job.is_active ? "Hide Job" : "Show Job"}
                                                        >
                                                            {job.is_active ? '👁️' : '🚫'}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteJob(job.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                                            title="Delete Job"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {jobs.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="p-10 text-center text-gray-400">
                                                        No jobs found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6">User Approvals</h2>
                        <div className="bg-white rounded-xl shadow border overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 font-medium">{user.email}</td>
                                            <td className="p-4 capitalize">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'provider' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {user.is_approved ? (
                                                    <span className="text-green-600 font-bold text-sm">✓ Active</span>
                                                ) : (
                                                    <span className="text-orange-500 font-bold text-sm">⏳ Pending</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => toggleUserApproval(user.id, user.is_approved)}
                                                    className={`px-4 py-2 rounded text-sm font-bold text-white transition ${user.is_approved ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                                                >
                                                    {user.is_approved ? 'Block' : 'Approve'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Admin;