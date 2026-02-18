import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Download, Image as ImageIcon } from 'lucide-react';

function Posters() {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Define the Fetch Function
    const fetchPosters = async () => {
      // Note: We don't set loading(true) here to avoid flickering on updates
      const { data, error } = await supabase
        .from('schemes')
        .select('*')
        .eq('active', true)
        .eq('category', 'Poster') // Strict filter for Posters
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else setPosters(data || []);
      
      setLoading(false); // Only stop loading after the first fetch
    };

    // 2. Initial Call
    fetchPosters();

    // 3. Real-time Subscription
    const channel = supabase
      .channel('posters-gallery-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schemes' },
        (payload) => {
          console.log('Poster change detected!', payload);
          // Only re-fetch if the changed item might be a poster
          // (Or just re-fetch everything to be safe and simple)
          fetchPosters();
        }
      )
      .subscribe();

    // 4. Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Download Function (Unchanged) ---
  const handleDownload = async (url, title) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Could not download image. Try right-clicking and 'Save Image As'.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Posters
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Browse and download high-quality posters, notices, and awareness materials.
          </p>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading gallery...</div>
        ) : posters.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
            <ImageIcon size={48} className="mx-auto text-gray-300 mb-4"/>
            <h3 className="text-lg font-bold text-gray-600">No posters found</h3>
            <p className="text-gray-400">
                Posters added via the Admin Panel will appear here.
            </p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {posters.map((item) => (
              <div key={item.id} className="break-inside-avoid bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
                
                {/* Image Container */}
                <div className="relative overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-auto object-cover transform group-hover:scale-105 transition duration-500"
                  />
                  {/* Overlay on Hover (Desktop) */}
                  <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition items-center justify-center">
                    <button 
                      onClick={() => handleDownload(item.image, item.title)}
                      className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition duration-300 hover:bg-blue-50"
                    >
                      <Download size={18} /> Download
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{item.title}</h3>
                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase whitespace-nowrap ml-2">
                      {item.category}
                    </span>
                  </div>
                  
                  {/* Mobile Download Button (Always Visible) */}
                  <button 
                    onClick={() => handleDownload(item.image, item.title)}
                    className="w-full md:hidden bg-gray-100 text-gray-700 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition"
                  >
                    <Download size={16} /> Save Image
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Posters;