import React, { useState, useEffect } from 'react';

function Carousel({ slides }) {
    if (!slides || slides.length === 0) return null;

    const [currentIndex, setCurrentIndex] = useState(0);

    // --- TOUCH STATE FOR SWIPING ---
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50; // Required distance (px) to register a swipe

    const prevSlide = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const nextSlide = () => {
        const isLastSlide = currentIndex === slides.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    const goToSlide = (slideIndex) => {
        setCurrentIndex(slideIndex);
    };

    // --- SWIPE LOGIC ---
    const onTouchStart = (e) => {
        setTouchEnd(null); // Reset
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide(); // Swipe Left -> Show Next
        }
        if (isRightSwipe) {
            prevSlide(); // Swipe Right -> Show Prev
        }
    };

    // --- DYNAMIC AUTOPLAY LOGIC ---
    useEffect(() => {
        // 1. Get duration for THIS specific slide (default to 5000ms if missing)
        const currentDuration = slides[currentIndex].duration || 5000;

        // 2. Use setTimeout instead of setInterval
        // This allows the timer to change length every time the slide changes
        const timer = setTimeout(() => {
            nextSlide();
        }, currentDuration);

        // 3. Clear the timer when the slide changes or component unmounts
        return () => clearTimeout(timer);
    }, [currentIndex, slides]); // Re-run this effect whenever index changes

    return (



        <div
            className='max-w-[1500px] h-[500px] md:h-[800px] w-full m-auto py-4 px-4 relative group'
            // --- ATTACH TOUCH HANDLERS HERE ---
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >

            <div className='w-full h-full rounded-2xl relative overflow-hidden bg-slate-900 '>
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                        {/* 1. IMAGE LAYER */}
                        <div className="absolute inset-0 w-full h-full">
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="w-full h-full object-cover object-center pointer-events-none"
                            />
                            {/* Optional: Very subtle dark overlay for better text contrast */}
                            <div className="absolute inset-0 bg-black/10"></div>
                        </div>

                        {/* 2. TEXT LAYER (Updated: Floating Box Style) */}
                        <div className="absolute bottom-8 left-4 md:bottom-16 md:left-16 max-w-[90%] md:max-w-2xl z-20">
                            <div className="bg-black/30 backdrop-blur-sm p-6 rounded-xl border-l-4 border-blue-500 shadow-lg text-white">
                                <h2 className="text-2xl md:text-4xl font-bold mb-2 leading-tight drop-shadow-lg">
                                    {slide.title}
                                </h2>

                                <p className="text-gray-200 text-sm md:text-lg mb-4 leading-relaxed drop-shadow-md line-clamp-3 md:line-clamp-none">
                                    {slide.description}
                                </p>

                                {slide.link && (
                                    <a
                                        href={slide.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm md:text-base font-bold text-blue-300 hover:text-white transition-colors inline-flex items-center gap-1"
                                    >
                                        Learn More <span>→</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Arrows */}
            <div className='hidden group-hover:block absolute top-[50%] -translate-x-0 translate-y-[-50%] left-6 z-20 text-4xl rounded-full p-2 text-white cursor-pointer bg-black/20 hover:bg-black/50 transition-all'>
                <button onClick={prevSlide}>❮</button>
            </div>
            <div className='hidden group-hover:block absolute top-[50%] -translate-x-0 translate-y-[-50%] right-6 z-20 text-4xl rounded-full p-2 text-white cursor-pointer bg-black/20 hover:bg-black/50 transition-all'>
                <button onClick={nextSlide}>❯</button>
            </div>

            {/* Dots */}
            <div className='flex justify-center py-2 absolute bottom-8 left-0 right-0 z-20'>
                {slides.map((_, slideIndex) => (
                    <div
                        key={slideIndex}
                        onClick={() => goToSlide(slideIndex)}
                        className={`text-2xl cursor-pointer mx-1  ${currentIndex === slideIndex ? 'text-blue-500' : 'text-white/70'}`}
                    >
                        ●
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Carousel;