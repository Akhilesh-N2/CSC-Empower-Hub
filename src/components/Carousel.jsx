import React, { useState, useEffect, useRef } from 'react';

function Carousel({ slides }) {
    if (!slides || slides.length === 0) return null;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const videoRefs = useRef([]);
    const minSwipeDistance = 50;

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
        setTouchEnd(null);
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

        if (isLeftSwipe) nextSlide();
        if (isRightSwipe) prevSlide();
    };

    // --- UNIFIED AUTOPLAY & TIMER LOGIC ---
    useEffect(() => {
        const currentSlide = slides[currentIndex];
        const isVideoSlide = isVideo(currentSlide.image);
        const durationSec = (currentSlide.duration || 5000) / 1000;

        setTimeLeft(durationSec);

        videoRefs.current.forEach((video, index) => {
            if (video) {
                if (index === currentIndex) {
                    video.currentTime = 0;
                    video.play().catch(e => console.log("Autoplay blocked:", e));
                } else {
                    video.pause();
                }
            }
        });

        if (isVideoSlide) return; 
        
        const intervalID = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    nextSlide();
                    return durationSec; 
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalID);

    }, [currentIndex, slides]);


    return (
        <div
            className='h-[400px] md:h-[550px] w-full m-auto relative group bg-white'
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className='w-full h-full relative overflow-hidden'>
                {slides.map((slide, index) => (
                    <div
                        key={slide.id || index}
                        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                    >
                        {/* 1. MEDIA LAYER */}
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                            {isVideo(slide.image) ? (
                                <video
                                    ref={el => videoRefs.current[index] = el}
                                    src={slide.image}
                                    muted
                                    playsInline
                                    onEnded={nextSlide} 
                                    onTimeUpdate={(e) => {
                                        const remaining = Math.ceil(e.target.duration - e.target.currentTime);
                                        if (remaining >= 0) setTimeLeft(remaining);
                                    }}
                                    // Use database value for object-fit scaling
                                    className={`w-full h-full ${slide.object_fit === 'contain' ? 'object-contain' : 'object-cover'} object-center pointer-events-none`}
                                />
                            ) : (
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    // Use database value for object-fit scaling
                                    className={`w-full h-full ${slide.object_fit === 'contain' ? 'object-contain' : 'object-cover'} object-center pointer-events-none`}
                                />
                            )}
                            {/* Subtle Overlay to make text readable if you add any */}
                            <div className="absolute inset-0 bg-black/5"></div>
                        </div>

                        {/* 2. TIMER DISPLAY (Top Right) */}
                        <div className="absolute top-4 right-4 z-30">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                                <span className="text-white text-xs font-bold notranslate">
                                    {timeLeft}s
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* NAVIGATION CONTROLS */}
            <button
                onClick={prevSlide}
                className='hidden group-hover:flex absolute top-1/2 left-4 -translate-y-1/2 z-30 items-center justify-center w-10 h-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/60 transition-all duration-300'
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </button>

            <button
                onClick={nextSlide}
                className='hidden group-hover:flex absolute top-1/2 right-4 -translate-y-1/2 z-30 items-center justify-center w-10 h-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/60 transition-all duration-300'
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </button>

            {/* PROGRESS DOTS */}
            <div className='flex justify-center py-2 absolute bottom-4 left-0 right-0 z-30'>
                {slides.map((_, slideIndex) => (
                    <div
                        key={slideIndex}
                        onClick={() => goToSlide(slideIndex)}
                        className={`h-1.5 rounded-full mx-1 cursor-pointer transition-all duration-300 ${
                            currentIndex === slideIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/50 hover:bg-white'
                        }`}
                    ></div>
                ))}
            </div>
        </div>
    );
}

export default Carousel;