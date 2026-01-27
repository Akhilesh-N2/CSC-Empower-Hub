import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

// Mock Data (Initial state for testing)
const initialSchemes = [
    {
        id: 1,
        title: "Pradhan Mantri Awas Yojana",
        category: "Housing",
        description: "Aiming to provide pucca houses with basic amenities.",
        image: "https://pmayg.nic.in/netiay/images/Slide1.jpg",
        visitUrl: "https://pmayg.nic.in/",
        downloadUrl: "",
        active: true
    }
];

function Admin({ schemes, setSchemes, carouselSlides, setCarouselSlides, categories, setCategories }) {
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' or 'carousel'

    // STATE FOR CATEGORY
    const [newCategoryInput, setNewCategoryInput] = useState("");
    const handleAddCategory = () => {
        if (newCategoryInput.trim() !== "") {
            // Add to the list (and avoid duplicates)
            if (!categories.includes(newCategoryInput)) {
                setCategories([...categories, newCategoryInput]);
                alert(`Category "${newCategoryInput}" added!`);
            } else {
                alert("Category already exists!");
            }
            setNewCategoryInput(""); // Clear input
        }
    };
    const handleDeleteCategory = () => {
        // 1. Check if a valid category is actually selected
        const categoryToDelete = currentScheme.category;

        if (!categoryToDelete || categoryToDelete === "") {
            alert("Please select a category from the dropdown first to delete it.");
            return;
        }

        // 2. Confirm with the user
        if (window.confirm(`Are you sure you want to delete the category "${categoryToDelete}"?`)) {

            // 3. Update the list (Filter out the deleted one)
            const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
            setCategories(updatedCategories);

            // 4. Reset the dropdown selection so it doesn't stay on the deleted item
            setCurrentScheme({ ...currentScheme, category: "" });
        }
    };




    // --- STATE FOR CARDS ---
    const [isEditing, setIsEditing] = useState(false);
    const [currentScheme, setCurrentScheme] = useState({
        id: null,
        title: '',
        category: '',
        description: '',
        image: '',
        visitUrl: '',
        downloadUrl: '',
        active: true
    });

    // --- CARD FUNCTIONS ---

    // Handle Input Change
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentScheme({
            ...currentScheme,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Optional: Check if it's a PDF
        if (file.type !== 'application/pdf') {
            alert("Please upload a PDF file.");
            return;
        }

        setUploading(true);

        try {
            // 1. Create a unique file name
            // We clean the name to avoid issues with spaces/symbols
            const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;

            // 2. Upload to Supabase
            // 'scheme-files' is the bucket name you created in Step 2
            const { data, error } = await supabase.storage
                .from('scheme-files')
                .upload(fileName, file);

            if (error) throw error;

            // 3. Get the Public URL for downloading
            const { data: publicUrlData } = supabase.storage
                .from('scheme-files')
                .getPublicUrl(fileName);

            const url = publicUrlData.publicUrl;

            // 4. Save URL to state
            setCurrentScheme(prev => ({ ...prev, downloadUrl: url }));
            alert("PDF Uploaded Successfully!");

        } catch (error) {
            console.error("Error uploading file:", error.message);
            alert("Failed to upload PDF: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    // Add or Update Scheme
    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            // Update existing
            setSchemes(schemes.map(item => (item.id === currentScheme.id ? currentScheme : item)));
            setIsEditing(false);
        } else {
            // Add new
            setSchemes([...schemes, { ...currentScheme, id: Date.now() }]);
        }
        // Reset Form
        setCurrentScheme({ id: null, title: '', category: '', description: '', image: '', visitUrl: '', downloadUrl: '', active: true });
    };

    // Edit Button Click
    const handleEdit = (scheme) => {
        setCurrentScheme(scheme);
        setIsEditing(true);
    };

    // Delete Button Click
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this scheme?")) {
            setSchemes(schemes.filter(item => item.id !== id));
        }
    };

    // Toggle Active Status
    const toggleActive = (id) => {
        setSchemes(schemes.map(item =>
            item.id === id ? { ...item, active: !item.active } : item
        ));
    };

    // --- NEW: CAROUSEL STATE ---
    const [currentSlide, setCurrentSlide] = useState({
        id: null,
        title: '',
        description: '',
        image: '',
        link: ''
    });

    // Handle Carousel Input
    const handleSlideInput = (e) => {
        const { name, value } = e.target;
        setCurrentSlide({ ...currentSlide, [name]: value });
    };

    // Add Slide
    const handleSlideSubmit = (e) => {
        e.preventDefault();
        setCarouselSlides([...carouselSlides, { ...currentSlide, id: Date.now() }]);
        setCurrentSlide({ id: null, title: '', description: '', image: '' }); // Reset
    };

    // Delete Slide
    const deleteSlide = (id) => {
        setCarouselSlides(carouselSlides.filter(slide => slide.id !== id));
    };

    return (
        <div className="flex h-[calc(100vh-5rem)] bg-gray-100">

            {/* SIDEBAR */}
            <div className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 text-2xl font-bold border-b border-slate-700">Admin Panel</div>
                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('cards')}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}
                    >
                        📑 Manage Cards
                    </button>
                    <button
                        onClick={() => setActiveTab('carousel')}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'carousel' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}
                    >
                        🖼️ Manage Carousel
                    </button>
                </nav>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-auto p-8">

                {/* --- TAB 1: CARDS MANAGEMENT --- */}
                {activeTab === 'cards' && (
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl font-bold text-gray-800 mb-8">Scheme Management</h2>

                        {/* FORM SECTION */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-10">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">{isEditing ? 'Edit Scheme' : 'Add New Scheme'}</h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Title */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text" name="title" required
                                        value={currentScheme.title} onChange={handleInputChange}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                {/* Category Section with Add AND Delete */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>

                                    {/* Row 1: Dropdown + Delete Button */}
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            name="category" required
                                            value={currentScheme.category} onChange={handleInputChange}
                                            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((cat, index) => (
                                                <option key={index} value={cat}>{cat}</option>
                                            ))}
                                        </select>

                                        {/* DELETE BUTTON */}
                                        <button
                                            type="button"
                                            onClick={handleDeleteCategory}
                                            title="Delete currently selected category"
                                            className="bg-red-100 text-red-600 px-3 rounded-lg border border-red-200 hover:bg-red-200 transition-colors"
                                        >
                                            {/* Trash Icon */}
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Row 2: Add New Category Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="New Category Name"
                                            value={newCategoryInput}
                                            onChange={(e) => setNewCategoryInput(e.target.value)}
                                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCategory}
                                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-700 whitespace-nowrap"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description" required rows="3"
                                        value={currentScheme.description} onChange={handleInputChange}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    ></textarea>
                                </div>

                                {/* Image URL */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                    <input
                                        type="url" name="image" required placeholder="https://..."
                                        value={currentScheme.image} onChange={handleInputChange}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                {/* Links */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Visit Link</label>
                                    <input
                                        type="url" name="visitUrl" required
                                        value={currentScheme.visitUrl} onChange={handleInputChange}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                {/* NEW CODE - PASTE THIS INSTEAD */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF / Form</label>

                                    <div className="flex flex-col gap-2">
                                        {/* The File Picker Button */}
                                        <input
                                            type="file"
                                            accept="application/pdf" // Only allow PDFs
                                            onChange={handleFileUpload} // Connects to your new Supabase function
                                            className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 cursor-pointer"
                                        />

                                        {/* Loading Message */}
                                        {uploading && (
                                            <span className="text-sm text-blue-600 font-medium animate-pulse">
                                                ⏳ Uploading to Supabase... please wait.
                                            </span>
                                        )}

                                        {/* Success Message: Shows the link once uploaded */}
                                        {currentScheme.downloadUrl && (
                                            <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200 break-all">
                                                <strong>✓ File Attached:</strong> <br />
                                                {currentScheme.downloadUrl}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div className="col-span-2 flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                    <input
                                        type="checkbox" name="active" id="activeToggle"
                                        checked={currentScheme.active} onChange={handleInputChange}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="activeToggle" className="text-gray-700 font-medium cursor-pointer select-none">
                                        Make this card Active immediately?
                                    </label>
                                </div>

                                {/* Buttons */}
                                <div className="col-span-2 flex gap-4 mt-2">
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                                        {isEditing ? 'Update Scheme' : 'Add Scheme'}
                                    </button>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => { setIsEditing(false); setCurrentScheme({ id: null, title: '', category: '', description: '', image: '', visitUrl: '', downloadUrl: '', active: true }); }}
                                            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* LIST SECTION */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-bold">
                                    <tr>
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
                                                <button
                                                    onClick={() => toggleActive(scheme.id)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold ${scheme.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                >
                                                    {scheme.active ? 'ACTIVE' : 'INACTIVE'}
                                                </button>
                                            </td>
                                            <td className="p-4 font-medium text-gray-900">{scheme.title}</td>
                                            <td className="p-4 text-gray-600">{scheme.category}</td>
                                            <td className="p-4 flex justify-center gap-3">
                                                <button
                                                    onClick={() => handleEdit(scheme)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(scheme.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {schemes.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-gray-500">No schemes added yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: CAROUSEL MANAGEMENT --- */}
                {activeTab === 'carousel' && (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-gray-800 mb-8">Carousel Manager</h2>

                        {/* ADD SLIDE FORM */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-10">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Add New Slide</h3>
                            <form onSubmit={handleSlideSubmit} className="grid grid-cols-1 gap-4">
                                <input
                                    type="text" name="title" placeholder="Slide Title (e.g., Welcome)" required
                                    value={currentSlide.title} onChange={handleSlideInput}
                                    className="p-2 border rounded-lg w-full"
                                />
                                <input
                                    type="text" name="description" placeholder="Short Description" required
                                    value={currentSlide.description} onChange={handleSlideInput}
                                    className="p-2 border rounded-lg w-full"
                                />
                                <input
                                    type="url" name="image" placeholder="Image URL (https://...)" required
                                    value={currentSlide.image} onChange={handleSlideInput}
                                    className="p-2 border rounded-lg w-full"
                                />
                                <input
                                    type="url" name="link" placeholder="Learn More Link (Optional)"
                                    value={currentSlide.link} onChange={handleSlideInput}
                                    className="p-2 border rounded-lg w-full"
                                />
                                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 w-fit">
                                    Add Slide
                                </button>
                            </form>
                        </div>

                        {/* SLIDES LIST */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {carouselSlides.map((slide) => (
                                <div key={slide.id} className="relative group overflow-hidden rounded-xl shadow-md bg-white">
                                    {/* Image Preview */}
                                    <img src={slide.image} alt={slide.title} className="w-full h-48 object-cover" />

                                    {/* Overlay Info */}
                                    <div className="absolute inset-0 bg-black/60 flex flex-col justify-end p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <h4 className="font-bold text-lg">{slide.title}</h4>
                                        <p className="text-sm">{slide.description}</p>
                                    </div>

                                    {/* Delete Button (Top Right) */}
                                    <button
                                        onClick={() => deleteSlide(slide.id)}
                                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-110"
                                        title="Delete Slide"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}

                            {carouselSlides.length === 0 && (
                                <p className="text-gray-500 col-span-2 text-center py-10">No slides added yet.</p>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Admin;