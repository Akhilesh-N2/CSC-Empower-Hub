import React from 'react';

// Defining the props this component expects
const SchemeCard = ({ image, title, description, visitUrl, downloadUrl, category }) => {
    return (
        // Main Card Container
        // 'group' allows child elements to change on hover
        // 'hover:-translate-y-1' makes the card float up slightly on hover
        <div className="max-w-sm bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-gray-100">

            {/* 1. Image Section */}
            <div className="relative overflow-hidden h-48">
                <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={image}
                    alt={title}
                />
                {/* A subtle overlay to make text pop if needed, optional */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Content Section */}
            <div className="p-6">

                {/* 2. NEW: Category Badge */}
                {/* Only render if category exists */}
                {category && (
                    <div className="mb-3">
                        <span className="inline-block px-3 py-1 text-xs font-bold tracking-wider text-blue-800 uppercase bg-blue-100 rounded-full">
                            {category}
                        </span>
                    </div>
                )}

                {/* 2. Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                    {title}
                </h3>

                {/* 3. Description */}
                {/* 'line-clamp-3' limits text to 3 lines and adds '...' if too long */}
                <p className="text-gray-600 text-base mb-6 line-clamp-3">
                    {description}
                </p>

                {/* Actions Container (Flex column to stack buttons) */}
                <div className="flex flex-col gap-3">

                    {/* 4. Visit Link Button (Primary Action - Blue) */}
                    <a
                        href={visitUrl}
                        target="_blank"
                        rel="noopener noreferrer" // Security best practice for new tabs
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200"
                    >
                        <span>Visit Scheme Page</span>
                        {/* External Link Icon SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 1 3 8.25v10.5A2.25 2.25 0 0 1 5.25 21h10.5A2.25 2.25 0 0 1 18 18.75V10.5m-10.5 6L21 3m0 0h-7.5M21 3v7.5" />
                        </svg>
                    </a>

                    {/* 5. Download Button (Secondary Action - Green Outline) */}
                    {/* Conditional rendering: Only show if downloadUrl exists */}
                    {downloadUrl && (
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 font-semibold py-2.5 px-4 rounded-xl transition-colors duration-200"
                        >
                            <span>Download Form/PDF</span>
                            {/* Download Icon SVG */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                        </a>
                    )}
                </div>

            </div>
        </div>
    );
};

export default SchemeCard;