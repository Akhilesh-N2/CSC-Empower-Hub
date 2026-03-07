// src/components/tools/PSCPhotoMaker.jsx
import React, { useState, useRef } from 'react';
import { UploadCloud, FileType, Download, CalendarClock } from 'lucide-react';

export default function PSCPhotoMaker() {
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setImage(readerEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePSCPhoto = () => {
    if (!image || !name || !date) return;
    setLoading(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // 1. SET PSC EXACT PIXEL DIMENSIONS
    const targetWidth = 150;
    const targetHeight = 200;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    img.onload = () => {
      // 2. Clear canvas
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 3. Draw image, scaled to fit the top portion
      // PSC typically requires face to cover 80% of photo. 
      // We will allow 25px at bottom for text
      const imageHeight = 175; 
      ctx.drawImage(img, 0, 0, targetWidth, imageHeight);

      // 4. Draw White Overlay Box at bottom
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, imageHeight, targetWidth, targetHeight - imageHeight);

      // 5. Draw Black Text (Name & Date)
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = 'bold 12px sans-serif'; // Bold to be readable at small size

      // Shorten name if too long to fit 150px
      let displayName = name.toUpperCase();
      const padding = 10;
      while (ctx.measureText(displayName).width > targetWidth - padding && displayName.length > 5) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName.length < name.length) displayName += "..";

      // Draw Name Line
      ctx.fillText(displayName, targetWidth / 2, imageHeight + 2);

      // Draw Date Line (Smaller, below name)
      ctx.font = '500 10px sans-serif';
      const formattedDate = date.split('-').reverse().join('/'); // DD/MM/YYYY
      ctx.fillText(formattedDate, targetWidth / 2, imageHeight + 14);

      // 6. Finalize as Downloadable Image
      const finalImageDataUrl = canvas.toDataURL('image/jpeg', 1.0); // PSC requires JPG

      const link = document.createElement("a");
      link.href = finalImageDataUrl;
      link.download = `PSC_${displayName.replace(/\s+/g, '_')}_Photo.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setLoading(false);
    };

    img.src = image;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center shadow-md">
          <FileType size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">PSC Photo Maker</h2>
          <p className="text-sm text-slate-500 font-medium">Generate standard 150x200px photo with Name & Date.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upload Column */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><FileType className="text-orange-500" size={18}/> Step 1: Upload Photo</h3>
          <div 
            onClick={() => fileInputRef.current.click()} 
            className={`relative group cursor-pointer border-2 border-dashed rounded-2xl aspect-[3/4] flex flex-col items-center justify-center p-6 text-center transition ${image ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50/50'}`}
          >
            {image ? (
              <img src={image} alt="User Upload" className="absolute inset-0 w-full h-full object-cover rounded-2xl group-hover:opacity-50 transition" />
            ) : (
              <>
                <UploadCloud size={32} className="text-slate-400 mb-3 group-hover:scale-110 transition group-hover:text-orange-500" />
                <p className="text-xs font-bold text-slate-600">Click to Upload Passport Photo</p>
                <p className="text-[10px] text-slate-400 mt-1">Image must have white/plain background.</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
        </div>

        {/* Inputs Column */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><UploadCloud className="text-orange-500" size={18}/> Step 2: Customer Details</h3>
          
          <div className="space-y-4 mb-6">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Customer Name (eg: RAMESH K)"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm uppercase"
            />
            <div className="relative">
              <CalendarClock size={18} className="absolute left-4 top-3.5 text-slate-400" />
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm text-slate-700"
              />
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><Download className="text-emerald-500" size={18}/> Step 3: Final Download</h3>
          
          <button 
            onClick={generatePSCPhoto}
            disabled={!image || !name || !date || loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-sm tracking-wide shadow-md flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-700 transition disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : `Download 150x200px Photo`}
          </button>
          
          <p className="text-[10px] text-slate-400 mt-2 text-center">Output is high-quality JPEG as required by Kerala PSC.</p>
        </div>
      </div>

      {/* Hidden Canvas used for manipulation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}