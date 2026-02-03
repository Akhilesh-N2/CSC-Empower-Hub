import React from 'react';

const SchemeCard = ({ image, title, description, visitUrl, downloadUrl, category }) => {
    const ImageArea = () => (
        <div className="relative overflow-hidden h-48 bg-gray-50">
            {image ? (
                <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={image}
                    alt={title || 'Scheme image'}
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

            <div className="absolute inset-0 bg-gradient-to-t from-black/12 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Hover quick actions */}
            <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                {visitUrl && (
                    <a href={visitUrl} target="_blank" rel="noopener noreferrer" className="bg-white/90 p-2 rounded-lg shadow-sm hover:bg-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v7.5M21 3h-7.5" />
                        </svg>
                    </a>
                )}
                {downloadUrl && (
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="bg-white/90 p-2 rounded-lg shadow-sm hover:bg-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
        <div className="max-w-sm bg-white rounded-2xl shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 group border border-gray-100 focus-within:ring-2 focus-within:ring-blue-200">
            <ImageArea />

            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        {category && (
                            <div className="mb-2">
                                <span className="inline-block px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">{category}</span>
                            </div>
                        )}

                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-3">{description}</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {visitUrl && (
                        <a
                            href={visitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                            <span>Learn More</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v7.5M21 3h-7.5" />
                            </svg>
                        </a>
                    )}

                    {downloadUrl ? (
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold py-2 px-3 rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                        >
                            <span>Download</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12L12 16.5 7.5 12" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9.5" />
                            </svg>
                        </a>
                    ) : (
                        <div className="hidden md:block" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SchemeCard;