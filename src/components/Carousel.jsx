import React, { useState, useEffect, useRef } from "react";

function Carousel({ slides }) {
  if (!slides || slides.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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

  // --- EFFECT 1: Slide Reset Logic ---
  useEffect(() => {
    const currentSlide = slides[currentIndex];
    const durationSec = (currentSlide.duration || 5000) / 1000;

    setTimeLeft(Math.ceil(durationSec));
    setIsPaused(false); 

    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.currentTime = 0;
          if (!isPaused) video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, slides]);

  // --- EFFECT 2: Timer & Autoplay ---
  useEffect(() => {
    if (isPaused) return;

    const currentSlide = slides[currentIndex];
    const isVideoSlide = isVideo(currentSlide.image);

    if (isVideoSlide) return; // Video uses onTimeUpdate for timer

    const intervalID = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          nextSlide();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalID);
  }, [currentIndex, slides, isPaused]);

  return (
    <div
      className="h-[300px] sm:h-[400px] md:h-[550px] w-full m-auto relative group bg-black"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="w-full h-full relative overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={slide.id || index}
            className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {/* 1. MEDIA LAYER */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              {isVideo(slide.image) ? (
                <video
                  ref={(el) => (videoRefs.current[index] = el)}
                  src={slide.image}
                  muted
                  playsInline
                  autoPlay
                  loop={false}
                  onEnded={nextSlide}
                  onTimeUpdate={(e) => {
                    const remaining = Math.ceil(e.target.duration - e.target.currentTime);
                    if (remaining >= 0 && !isPaused && index === currentIndex) setTimeLeft(remaining);
                  }}
                  className={`w-full h-full ${slide.object_fit === "contain" ? "object-contain" : "object-cover"} object-center pointer-events-none`}
                />
              ) : (
                <img
                  src={slide.image}
                  alt={slide.title || "Carousel slide"}
                  className={`w-full h-full ${slide.object_fit === "contain" ? "object-contain" : "object-cover"} object-center pointer-events-none`}
                />
              )}

              {/* Clickable Overlay for Pausing */}
              <div
                onClick={() => setIsPaused(!isPaused)}
                className="absolute inset-0 bg-black/5 cursor-pointer pointer-events-auto group/pausebox z-20"
              >
                {/* Pause/Resume Badge */}
                <div
                  className={`
                    absolute bottom-20 left-1/2 -translate-x-1/2 
                    transform transition-all duration-300 pointer-events-none
                    ${isPaused ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover/pausebox:opacity-100 group-hover/pausebox:scale-100"}
                    bg-black/60 text-white px-5 py-2.5 rounded-full backdrop-blur-md shadow-xl font-bold text-xs tracking-wide flex items-center gap-2
                  `}
                >
                  {isPaused ? "Resume Slide" : "Pause Slide"}
                </div>
              </div>
            </div>

            {/* 2. ACTION BUTTON */}
            {slide.link && index === currentIndex && (
              <div className="absolute bottom-10 left-0 w-full flex justify-center z-30">
                <a
                  href={slide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold py-3 px-10 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                >
                  Learn More
                </a>
              </div>
            )}

            {/* 3. TIMER DISPLAY */}
            <div className="absolute top-4 right-4 z-30 pointer-events-none">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                <span className="text-white text-[10px] font-black notranslate">
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* NAVIGATION CONTROLS (Desktop Only) */}
      <button
        onClick={prevSlide}
        className="hidden md:group-hover:flex absolute top-1/2 left-4 -translate-y-1/2 z-40 items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/10 hover:bg-white/30 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="hidden md:group-hover:flex absolute top-1/2 right-4 -translate-y-1/2 z-40 items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/10 hover:bg-white/30 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* PROGRESS DOTS */}
      <div className="flex justify-center py-2 absolute bottom-4 left-0 right-0 z-40">
        {slides.map((_, slideIndex) => (
          <button
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`h-1.5 rounded-full mx-1 transition-all duration-300 ${
              currentIndex === slideIndex ? "w-8 bg-blue-500" : "w-2 bg-white/40 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default Carousel;