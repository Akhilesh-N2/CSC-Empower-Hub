import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UploadCloud, Trash2, Eye, EyeOff } from 'lucide-react';

export default function AdminPosterManager({ schemes, fetchData, uploadToCloudinary, formatFolderName }) {
  const [posterTitle, setPosterTitle] = useState("");
  const [posterImage, setPosterImage] = useState("");
  const [posterUploading, setPosterUploading] = useState(false);

  const handlePosterUpload = async (e) => {
    if (!posterTitle) {
      e.target.value = "";
      return alert("Please enter a Poster Title first so we can organize the image!");
    }
    const file = e.target.files[0];
    if (!file) return;
    setPosterUploading(true);
    try {
      const safeTitle = formatFolderName(posterTitle);
      const secureUrl = await uploadToCloudinary(file, `Posters/${safeTitle}`);
      setPosterImage(secureUrl);
      alert(`Poster safely stored in Cloudinary!`);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setPosterUploading(false);
    }
  };

  const handlePosterSubmit = async (e) => {
    e.preventDefault();
    if (!posterImage) return alert("Please upload an image.");
    await supabase.from("schemes").insert([{
      title: posterTitle, category: "Poster", type: "scheme", image: posterImage, active: true, description: "Awareness Poster",
    }]);
    alert("Poster published!");
    setPosterTitle("");
    setPosterImage("");
    fetchData();
  };

  const toggleContentActive = async (id, currentStatus) => {
    await supabase.from("schemes").update({ active: !currentStatus }).eq("id", id);
    fetchData();
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm("Permanently delete this item?")) return;
    await supabase.from("schemes").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Poster Manager</h2>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border">
          Total Posters: {schemes.filter((i) => i.category === "Poster").length}
        </span>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-10">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <UploadCloud size={24} className="text-blue-600" /> Upload New Poster
        </h3>
        <form onSubmit={handlePosterSubmit} className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Poster Title</label>
              <input type="text" value={posterTitle} onChange={(e) => setPosterTitle(e.target.value)} placeholder="e.g. Free Eye Camp Notice" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={posterUploading || !posterImage} className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all ${posterUploading || !posterImage ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {posterUploading ? "Uploading..." : "🚀 Publish Poster"}
            </button>
          </div>
          <div className="flex-1">
            <div className={`relative border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center text-center transition-all ${posterImage ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"}`}>
              <input type="file" accept="image/*" onChange={handlePosterUpload} disabled={posterUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              {posterUploading ? (<div className="animate-pulse text-blue-600 font-bold">Uploading...</div>) : posterImage ? (
                <img src={posterImage} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
              ) : (
                <div className="p-4">
                  <UploadCloud size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-900 font-bold text-sm">Click to upload image</p>
                  <p className="text-xs text-gray-500">SVG, PNG, JPG</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {schemes.filter((item) => item.category === "Poster").map((poster) => (
          <div key={poster.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full">
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <img src={poster.image} alt={poster.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 text-xs font-bold rounded-full border shadow-sm ${poster.active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>{poster.active ? "Active" : "Hidden"}</span>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1" title={poster.title}>{poster.title}</h4>
              <p className="text-xs text-gray-400 mb-4">Added: {new Date(poster.created_at).toLocaleDateString()}</p>
              <div className="mt-auto flex gap-2">
                <button onClick={() => toggleContentActive(poster.id, poster.active)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition ${poster.active ? "border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-red-600" : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"}`}>
                  {poster.active ? (<><EyeOff size={14} /> Hide</>) : (<><Eye size={14} /> Publish</>)}
                </button>
                <button onClick={() => handleDeleteContent(poster.id)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 rounded-lg transition" title="Delete Permanently">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {schemes.filter((item) => item.category === "Poster").length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">No posters uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}