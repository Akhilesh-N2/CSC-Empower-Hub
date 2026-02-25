import React from 'react';

const SchemeCard = ({ image, title, description, visitUrl, downloadUrl, category }) => {
    
    // OPTIMIZATION: Transform Cloudinary URL to request a smaller, optimized version for the card
    // This reduces data usage significantly for your users
    const getOptimizedImage = (url) => {
        if (!url || !url.includes('cloudinary.com')) return image;
        // Requests a 600px wide image with auto-quality and auto-format (WebP/Avif)
        return url.replace('/upload/', '/upload/w_600,c_fill,g_auto,q_auto,f_auto/');
    };

    const ImageArea = () => (
        <div className="relative overflow-hidden h-48 bg-gray-100 shrink-0">
            {image ? (
                <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={getOptimizedImage(image)}
                    alt={title || 'Scheme image'}
                    loading="lazy" // Performance: Only load images when they enter the viewport
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-indigo-50 to-white">
                    <svg className="w-16 h-16 text-indigo-200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M7 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {/* Hover quick actions (Desktop Only for better UX) */}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-2 translate-y-1 group-hover:translate-y-0">
                {visitUrl && (
                    <a href={visitUrl} target="_blank" rel="noopener noreferrer" className="bg-white/95 p-2 rounded-lg shadow-md hover:bg-blue-600 hover:text-white transition-colors" title="Visit Website">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v7.5M21 3h-7.5" />
                        </svg>
                    </a>
                )}
                {downloadUrl && (
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="bg-white/95 p-2 rounded-lg shadow-md hover:bg-emerald-600 hover:text-white transition-colors" title="Download PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12L12 16.5 7.5 12" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9.5" />
                        </svg>
                    </a>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
            <ImageArea />

            <div className="p-5 flex flex-col flex-1">
                <div className="flex-1">
                    {category && (
                        <div className="mb-2">
                            <span className="inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold text-blue-700 bg-blue-50 rounded-md border border-blue-100">
                                {category}
                            </span>
                        </div>
                    )}

                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors" title={title}>
                        {title || "Untitled Scheme"}
                    </h3>
                    
                    <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                        {description || "No description provided for this resource."}
                    </p>
                </div>

                {/* Main Action Buttons */}
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visitUrl ? (
                        <a
                            href={visitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            <span>Learn More</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v7.5M21 3h-7.5" />
                            </svg>
                        </a>
                    ) : (
                        <div className="hidden sm:block" />
                    )}

                    {downloadUrl ? (
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95"
                        >
                            <span>Download</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12L12 16.5 7.5 12" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9.5" />
                            </svg>
                        </a>
                    ) : (
                        <div className="hidden sm:block" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SchemeCard;