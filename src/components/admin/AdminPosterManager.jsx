import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UploadCloud, Trash2, Eye, EyeOff, Crown, Filter, Unlock } from 'lucide-react';

export default function AdminPosterManager({ schemes, fetchData, uploadToCloudinary, formatFolderName }) {
  const [posterTitle, setPosterTitle] = useState("");
  const [posterImage, setPosterImage] = useState("");
  const [posterUploading, setPosterUploading] = useState(false);
  
  // State to track if the new upload is Premium
  const [isPremium, setIsPremium] = useState(false);

  // State to filter the admin gallery view
  const [viewFilter, setViewFilter] = useState("all"); // 'all', 'free', 'premium'

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
      
      // ✨ FIX: Dynamically assign the Cloudinary folder based on the Premium toggle!
      const targetFolder = isPremium ? `Pro Posters/${safeTitle}` : `Posters/${safeTitle}`;
      
      const secureUrl = await uploadToCloudinary(file, targetFolder);
      setPosterImage(secureUrl);
      alert(`Poster safely stored in Cloudinary (${isPremium ? 'Pro Posters' : 'Posters'} folder)!`);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setPosterUploading(false);
    }
  };

  const handlePosterSubmit = async (e) => {
    e.preventDefault();
    if (!posterImage) return alert("Please upload an image.");
    
    // Insert the 'is_premium' flag into Supabase
    await supabase.from("schemes").insert([{
      title: posterTitle, 
      category: "Poster", 
      type: "scheme", 
      image: posterImage, 
      active: true, 
      description: "Awareness Poster",
      is_premium: isPremium 
    }]);
    
    alert(`Success! ${isPremium ? 'Premium' : 'Free Guest'} Poster published!`);
    setPosterTitle("");
    setPosterImage("");
    setIsPremium(false); // Reset toggle
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

  // Filter the posters based on the selected tab
  const allPosters = schemes.filter((item) => item.category === "Poster");
  const visiblePosters = allPosters.filter((item) => {
    if (viewFilter === "free") return !item.is_premium;
    if (viewFilter === "premium") return item.is_premium;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Poster Manager</h2>
          <p className="text-sm text-gray-500">Upload and manage promotional content.</p>
        </div>
        
        {/* STATS BADGES */}
        <div className="flex gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
            <Unlock size={14} /> Free: {allPosters.filter(p => !p.is_premium).length}
          </span>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
            <Crown size={14} /> PRO: {allPosters.filter(p => p.is_premium).length}
          </span>
        </div>
      </div>

      {/* UPLOAD SECTION */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-10">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <UploadCloud size={24} className="text-blue-600" /> Upload New Poster
        </h3>
        <form onSubmit={handlePosterSubmit} className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Poster Title</label>
              <input type="text" value={posterTitle} onChange={(e) => setPosterTitle(e.target.value)} placeholder="e.g. Free Eye Camp Notice" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>

            {/* PREMIUM TOGGLE SWITCH */}
            <div className={`p-4 border rounded-xl transition-colors ${isPremium ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
              <label className="flex items-center cursor-pointer gap-3">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
                  <div className={`block w-12 h-7 rounded-full transition-colors ${isPremium ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${isPremium ? 'translate-x-5' : ''}`}></div>
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-bold flex items-center gap-1.5 ${isPremium ? "text-amber-700" : "text-slate-600"}`}>
                    <Crown size={16} /> Premium Access Only (PRO Shops)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isPremium ? "Hidden from guests. Uploads to 'Pro Posters' folder." : "Visible to everyone. Uploads to 'Posters' folder."}
                  </span>
                </div>
              </label>
            </div>

            <button type="submit" disabled={posterUploading || !posterImage} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${posterUploading || !posterImage ? "bg-gray-300 cursor-not-allowed" : isPremium ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}`}>
              {posterUploading ? "Uploading..." : isPremium ? <><Crown size={18}/> Publish Premium Poster</> : "🚀 Publish Free Poster"}
            </button>
          </div>

          <div className="flex-1">
            <div className={`relative border-2 border-dashed rounded-xl h-full min-h-[220px] flex flex-col items-center justify-center text-center transition-all ${posterImage ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"}`}>
              {/* Note: User must choose Premium toggle BEFORE selecting image for folder logic to work perfectly */}
              <input type="file" accept="image/*" onChange={handlePosterUpload} disabled={posterUploading || !posterTitle} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              {posterUploading ? (<div className="animate-pulse text-blue-600 font-bold">Uploading to Cloudinary...</div>) : posterImage ? (
                <img src={posterImage} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
              ) : (
                <div className="p-6">
                  <UploadCloud size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-900 font-bold text-sm">
                    {!posterTitle ? "Type a title first!" : "Click to select image"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">High quality JPG or PNG</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* GALLERY FILTER TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-200 pb-4">
        <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
           Gallery Management
        </h3>
        
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setViewFilter("all")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
             All
          </button>
          <button onClick={() => setViewFilter("free")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewFilter === "free" ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" : "text-slate-500 hover:text-slate-700"}`}>
            <Unlock size={14}/> Guest / Free
          </button>
          <button onClick={() => setViewFilter("premium")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewFilter === "premium" ? "bg-amber-50 text-amber-700 shadow-sm border border-amber-100" : "text-slate-500 hover:text-slate-700"}`}>
            <Crown size={14}/> Premium
          </button>
        </div>
      </div>

      {/* GALLERY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {visiblePosters.map((poster) => (
          <div key={poster.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full relative">
            
            {/* PREMIUM BADGE ON CARD */}
            {poster.is_premium && (
              <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Crown size={12}/> PRO
              </div>
            )}

            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <img src={poster.image} alt={poster.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              <div className="absolute top-2 right-2 z-10">
                <span className={`px-2 py-1 text-[10px] font-bold rounded-full shadow-md backdrop-blur-sm ${poster.active ? "bg-green-100/90 text-green-700 border border-green-200/50" : "bg-red-100/90 text-red-700 border border-red-200/50"}`}>{poster.active ? "Live" : "Hidden"}</span>
              </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1" title={poster.title}>{poster.title}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Added {new Date(poster.created_at).toLocaleDateString()}
              </p>
              
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

        {visiblePosters.length === 0 && (
          <div className="col-span-full py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
             <Filter size={32} className="mx-auto text-gray-300 mb-3" />
             <h3 className="font-bold text-gray-700 text-lg">No posters found</h3>
             <p className="text-gray-500 text-sm mt-1">Try changing your filter tabs or uploading a new poster.</p>
          </div>
        )}
      </div>
    </div>
  );
}