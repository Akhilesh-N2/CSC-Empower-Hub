import React, { useState, useEffect, useRef } from 'react';

function Carousel({ slides }) {
    if (!slides || slides.length === 0) return null;

    const [currentIndex, setCurrentIndex] = useState(0);

    // --- TOUCH STATE FOR SWIPING ---
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const videoRefs = useRef([]);
    const minSwipeDistance = 50; // Required distance (px) to register a swipe


    const isVideo = (url) => {
        if (!url) return false;
        return url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i) !== null;
    };

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
    // --- SMART AUTOPLAY LOGIC ---
    useEffect(() => {
        const currentSlide = slides[currentIndex];
        const isCurrentVideo = isVideo(currentSlide.image);

        // 1. Handle Video Playback Control
        // Loop through all videos and pause them, only play the current one
        videoRefs.current.forEach((video, index) => {
            if (video) {
                if (index === currentIndex) {
                    video.currentTime = 0; // Restart video from beginning
                    video.play().catch(e => console.log("Autoplay blocked:", e));
                } else {
                    video.pause();
                }
            }
        });

        // 2. Timer Logic
        // If it is a VIDEO, we DO NOT set a timer. We wait for 'onEnded'.
        // If it is an IMAGE, we use the duration timer.
        if (!isCurrentVideo) {
            const currentDuration = currentSlide.duration || 5000;
            const timer = setTimeout(() => {
                nextSlide();
            }, currentDuration);

            return () => clearTimeout(timer);
        }
        // If video, no timer cleanup needed (the onEnded event handles the transition)

    }, [currentIndex, slides]);

    return (



        <div
            className=' h-[500px] md:h-[550px] w-full m-auto  relative group'
            // --- ATTACH TOUCH HANDLERS HERE ---
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >

            <div className='w-full h-full relative overflow-hidden bg-slate-900 '>
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                        {/* 1. IMAGE LAYER */}
                        <div className="absolute inset-0 w-full h-full bg-white">
                            {isVideo(slide.image) ? (
                                <video
                                    ref={el => videoRefs.current[index] = el} // Store ref
                                    src={slide.image}
                                    muted
                                    playsInline
                                    onEnded={nextSlide}
                                    className={`w-full h-full ${slide.object_fit === 'contain' ? 'object-contain' : 'object-cover'} object-center pointer-events-none`}
                                />
                            ) : (
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className={`w-full h-full ${slide.object_fit === 'contain' ? 'object-contain' : 'object-cover'} object-center pointer-events-none`}
                                />
                            )}
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/10"></div>
                        </div>

                        {/* 2. TEXT LAYER (Centered) */}
                        <div className="absolute inset-0 flex flex-col justify-end items-center pb-16 md:pb-15 z-20 pointer-events-none">

                            {/* The Box itself (Enable pointer events here so buttons work) */}
                            <div className="max-w-[90%] md:max-w-2xl bg-black/40 backdrop-blur-sm p-8 rounded-xl border border-white/20 shadow-2xl text-center pointer-events-auto transition-transform duration-500 hover:scale-105">

                                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-white drop-shadow-lg tracking-wide">
                                    {slide.title}
                                </h2>

                                <p className="text-gray-100 text-base md:text-xl mb-6 leading-relaxed drop-shadow-md">
                                    {slide.description}
                                </p>

                                {slide.link && (
                                    <a
                                        href={slide.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg transition-all transform hover:-translate-y-1"
                                    >
                                        Learn More
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Left Arrow */}
            <button
                onClick={prevSlide}
                className='hidden group-hover:flex absolute top-1/2 left-4 -translate-y-1/2 z-30 
               items-center justify-center w-16 h-12 rounded-full 
               bg-white/20 text-black backdrop-blur-sm  
               transition-all duration-300 hover:scale-105 hover:text-blue-600 border'
                aria-label="Previous Slide"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </button>

            {/* Right Arrow */}
            <button
                onClick={nextSlide}
                className='hidden group-hover:flex absolute top-1/2 right-4 -translate-y-1/2 z-30 
               items-center justify-center w-16 h-12 rounded-full 
                text-black backdrop-blur-sm border
               transition-all duration-300 hover:scale-105 hover:text-blue-600'
                aria-label="Next Slide"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </button>

            {/* Dots */}
            <div className='flex justify-center py-2 absolute bottom-8 left-0 right-0 z-20'>
                {slides.map((_, slideIndex) => (
                    <div
                        key={slideIndex}
                        onClick={() => goToSlide(slideIndex)}
                        className={`text-4xl cursor-pointer mx-1  ${currentIndex === slideIndex ? 'text-black' : 'text-white/70'}`}
                    >
                        ___
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Carousel;