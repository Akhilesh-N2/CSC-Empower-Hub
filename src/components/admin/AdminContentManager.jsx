import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminContentManager({ schemes, categories, fetchData, uploadToCloudinary, formatFolderName, defaultImage }) {
  const [isEditing, setIsEditing] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [currentScheme, setCurrentScheme] = useState({
    id: null, title: "", category: "", type: "scheme", description: "", image: "", visitUrl: "", downloadUrl: "", active: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentScheme({ ...currentScheme, [name]: type === "checkbox" ? checked : value });
  };

  const handleAddCategory = async () => {
    if (newCategoryInput.trim() !== "") {
      if (!categories.includes(newCategoryInput)) {
        try {
          const { error } = await supabase.from("categories").insert([{ name: newCategoryInput }]);
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
        await supabase.from("categories").delete().eq("name", categoryToDelete);
        setCurrentScheme({ ...currentScheme, category: "" });
        fetchData();
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  };

  const handlePdfUpload = async (e) => {
    if (!currentScheme.category) {
      e.target.value = "";
      return alert("Please select a Category first so we can organize the file!");
    }
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") return alert("Please upload a PDF.");

    setPdfUploading(true);
    try {
      const safeCategory = formatFolderName(currentScheme.category);
      const targetFolder = currentScheme.type === "form" ? `Forms/${safeCategory}` : `Schemes/${safeCategory}`;
      const secureUrl = await uploadToCloudinary(file, targetFolder);
      setCurrentScheme((prev) => ({ ...prev, downloadUrl: secureUrl }));
      alert(`PDF safely stored in Cloudinary folder: ${targetFolder}`);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setPdfUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    if (!currentScheme.category) {
      e.target.value = "";
      return alert("Please select a Category first so we can organize the image!");
    }
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return alert("Please upload an image.");

    setImageUploading(true);
    try {
      const safeCategory = formatFolderName(currentScheme.category);
      const targetFolder = currentScheme.type === "form" ? `Forms/${safeCategory}` : `Schemes/${safeCategory}`;
      const secureUrl = await uploadToCloudinary(file, targetFolder);
      setCurrentScheme((prev) => ({ ...prev, image: secureUrl }));
      alert(`Image safely stored in Cloudinary folder: ${targetFolder}`);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentScheme.type === "form" && !currentScheme.downloadUrl) {
      return alert("PDF is mandatory for downloadable forms.");
    }

    const schemeFields = {
      title: currentScheme.title, category: currentScheme.category, type: currentScheme.type, description: currentScheme.description,
      image: currentScheme.image || defaultImage, visitUrl: currentScheme.visitUrl, downloadUrl: currentScheme.downloadUrl, active: currentScheme.active,
    };

    try {
      if (isEditing) {
        const { error } = await supabase.from("schemes").update(schemeFields).eq("id", currentScheme.id);
        if (error) throw error;
        alert("Item updated successfully!");
        setIsEditing(false);
      } else {
        const { error } = await supabase.from("schemes").insert([schemeFields]);
        if (error) throw error;
        alert("New item added to database!");
      }
      setCurrentScheme({ id: null, title: "", category: "", type: "scheme", description: "", image: "", visitUrl: "", downloadUrl: "", active: true });
      fetchData();
    } catch (error) {
      alert("Database Error: " + (error.details || error.message));
    }
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm("Permanently delete this item?")) return;
    await supabase.from("schemes").delete().eq("id", id);
    fetchData();
  };

  const toggleContentActive = async (id, currentStatus) => {
    await supabase.from("schemes").update({ active: !currentStatus }).eq("id", id);
    fetchData();
  };

  const handleEdit = (scheme) => {
    setCurrentScheme(scheme);
    setIsEditing(true);
  };

  const filteredContent = schemes.filter((s) => {
    if (s.category === "Poster") return false;
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "" || s.category === filterCategory;
    const matchesType = filterType === "" || s.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredContent.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Content Management</h2>
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-700">{isEditing ? "Edit Item" : "Add New Item"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-bold text-blue-800 mb-2">Display Type</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                <input type="radio" name="type" value="scheme" checked={currentScheme.type === "scheme"} onChange={handleInputChange} className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="block font-medium text-gray-800">Useful Links</span>
                  <span className="block text-xs text-gray-500">(Home Page)</span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:border-blue-400">
                <input type="radio" name="type" value="form" checked={currentScheme.type === "form"} onChange={handleInputChange} className="w-5 h-5 text-blue-600" />
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
                {categories.map((cat, index) => (<option key={index} value={cat}>{cat}</option>))}
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
          {currentScheme.type === "scheme" && (
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF {currentScheme.type === "form" && <span className="text-red-500">*</span>}</label>
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {pdfUploading && <span className="text-sm text-blue-600 animate-pulse">⏳ Uploading...</span>}
            {currentScheme.downloadUrl && <div className="text-xs text-green-700 mt-1 break-all">✓ Attached</div>}
          </div>
          <div className="col-span-1 md:col-span-2 flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <input type="checkbox" name="active" checked={currentScheme.active} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
            <label className="text-gray-700 font-medium">Make this active immediately?</label>
          </div>
          <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              {isEditing ? "Update Item" : "Add Item"}
            </button>
            {isEditing && (
              <button type="button" onClick={() => { setIsEditing(false); setCurrentScheme({ id: null, title: "", category: "", type: "scheme", description: "", image: "", visitUrl: "", downloadUrl: "", active: true }); }} className="w-full sm:w-auto px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input type="text" placeholder="Search by Title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="relative md:w-1/4">
          <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none">
            <option value="">All Types</option>
            <option value="scheme">Useful Links</option>
            <option value="form">Forms (PDFs)</option>
          </select>
        </div>
        <div className="relative md:w-1/4">
          <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none">
            <option value="">All Categories</option>
            {categories.map((c, i) => (<option key={i} value={c}>{c}</option>))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-bold">
              <tr>
                <th className="p-4">Type</th>
                <th className="p-4">Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((s) => (
                <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.type === "form" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {s.type ? s.type.toUpperCase() : "SCHEME"}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-gray-900">{s.title}</td>
                  <td className="p-4 text-gray-600">{s.category}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => toggleContentActive(s.id, s.active)} className={`px-3 py-1 rounded-full text-xs font-bold ${s.active ? "bg-green-100 text-green-700 hover:bg-green-300" : "bg-red-100 text-red-700 hover:bg-red-300"}`}>
                      {s.active ? "ACTIVE" : "INACTIVE"}
                    </button>
                    <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Edit</button>
                    <button onClick={() => handleDeleteContent(s.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Delete</button>
                  </td>
                </tr>
              ))}
              {filteredContent.length === 0 && (
                <tr><td colSpan="4" className="p-6 text-center text-gray-500">No content found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredContent.length > itemsPerPage && (
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-medium">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-600">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-600">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}