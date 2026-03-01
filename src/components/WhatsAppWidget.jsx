import React, { useState, useEffect } from 'react';

export default function WhatsAppWidget() {
  const [isScrolling, setIsScrolling] = useState(false);

  // Add your actual WhatsApp Group Link here!
  const whatsappLink = "https://chat.whatsapp.com/YOUR_INVITE_LINK";

  useEffect(() => {
    let scrollTimeout;

    const handleScroll = () => {
      // Hide button immediately on scroll
      setIsScrolling(true);

      clearTimeout(scrollTimeout);

      // Show button again 500ms after scrolling stops
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 500); 
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div 
      // Adjusted top position: 75% on mobile (easier for thumbs), 70% on desktop
      className={`fixed right-0 top-[89%] md:top-[90%] z-50 transition-transform duration-500 ease-in-out ${
        isScrolling ? 'translate-x-full' : 'translate-x-0'
      }`}
    >
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        // Dynamic padding: Just enough for the icon on mobile, wider on desktop
        className="flex items-center gap-2.5 bg-[#25D366] text-white p-3.5 md:p-3 md:pr-4 rounded-l-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:bg-[#128C7E] md:hover:pr-6 transition-all duration-300 group"
        title="Join our WhatsApp Group"
      >
        {/* Official WhatsApp SVG Logo - slightly larger on mobile for easy tapping */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          className="w-7 h-7 md:w-6 md:h-6 ml-0.5 md:ml-1 drop-shadow-sm"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>

        {/* HIDDEN ON MOBILE (hidden md:flex) - Only text shows on larger screens */}
        <div className="hidden md:flex flex-col">
          <span className="font-black text-sm tracking-tight leading-none text-white whitespace-nowrap">
            Join Updates
          </span>
          <span className="text-[9px] font-bold text-green-100 uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-0 group-hover:h-auto overflow-hidden">
            WhatsApp
          </span>
        </div>
      </a>
    </div>
  );
}