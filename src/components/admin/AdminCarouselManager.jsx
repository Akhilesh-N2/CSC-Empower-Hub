import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Trash2 } from 'lucide-react';

export default function AdminCarouselManager({ carouselSlides, fetchData, uploadToCloudinary, isVideo }) {
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [slideImageUploading, setSlideImageUploading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState({
    id: null, title: "", description: "", image: "", link: "", duration: 5000, object_fit: "cover",
  });

  const handleSlideInput = (e) => setCurrentSlide({ ...currentSlide, [e.target.name]: e.target.value });

  const handleSlideImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSlideImageUploading(true);
    try {
      const secureUrl = await uploadToCloudinary(file, "Carousel");
      setCurrentSlide((prev) => ({ ...prev, image: secureUrl }));
      alert("Media Uploaded securely to Cloudinary!");
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setSlideImageUploading(false);
    }
  };

  const handleSlideSubmit = async (e) => {
    e.preventDefault();
    if (!currentSlide.image) return alert("Please wait for the image to upload or select a file first!");
    const { id, ...slideData } = currentSlide;
    const finalData = { ...slideData, duration: parseInt(slideData.duration) || 5000 };
    
    try {
      if (isEditingSlide) {
        const { error } = await supabase.from("slides").update(finalData).eq("id", id);
        if (error) throw error;
        alert("Slide updated successfully!");
      } else {
        const { error } = await supabase.from("slides").insert([finalData]);
        if (error) throw error;
        alert("Slide added successfully!");
      }
      cancelSlideEdit();
      fetchData();
    } catch (error) {
      alert(`Database Error: ${error.message || error.details}`);
    }
  };

  const deleteSlide = async (id) => {
    if (window.confirm("Delete this slide?")) {
      await supabase.from("slides").delete().eq("id", id);
      fetchData();
    }
  };

  const handleEditSlide = (slide) => {
    setCurrentSlide(slide);
    setIsEditingSlide(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelSlideEdit = () => {
    setIsEditingSlide(false);
    setCurrentSlide({ id: null, title: "", description: "", image: "", link: "", duration: 5000, object_fit: "cover" });
  };

  return (
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
                    <video src={currentSlide.image} className={`h-20 rounded border ${currentSlide.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`} muted autoPlay loop />
                  ) : (
                    <img src={currentSlide.image} alt="Preview" className={`h-20 rounded border ${currentSlide.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`} />
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="block text-sm font-bold text-blue-800 mb-2">Image Scaling</label>
              <select name="object_fit" value={currentSlide.object_fit} onChange={handleSlideInput} className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
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
          <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 w-full sm:w-fit font-bold">
            Add Slide
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {carouselSlides.map((s) => (
          <div key={s.id} className="relative group rounded-xl overflow-hidden shadow h-48 bg-slate-200 border border-gray-300">
            {isVideo(s.image) ? (
              <video src={s.image} className={`w-full h-full ${s.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`} muted autoPlay loop playsInline />
            ) : (
              <img src={s.image} className={`w-full h-full ${s.object_fit === "contain" ? "object-contain bg-black" : "object-cover"}`} alt="Slide" />
            )}
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm border border-white/20">
                {s.object_fit === "contain" ? "Whole" : "Cropped"}
              </span>
            </div>
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button onClick={() => handleEditSlide(s)} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg" title="Edit Slide">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button onClick={() => deleteSlide(s.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg" title="Delete Slide">
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
  );
}