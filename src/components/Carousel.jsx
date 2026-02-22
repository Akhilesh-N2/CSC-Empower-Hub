import React, { useState, useEffect, useRef } from "react";

function Carousel({ slides }) {
  if (!slides || slides.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // NEW: Track pause state

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

  // --- EFFECT 1: Reset Timer & Unpause on Slide Change ---
  useEffect(() => {
    const currentSlide = slides[currentIndex];
    const durationSec = (currentSlide.duration || 5000) / 1000;

    setTimeLeft(durationSec);
    setIsPaused(false); // Always start playing when a new slide appears

    // Reset video to start
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.currentTime = 0;
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, slides]);

  // --- EFFECT 2: Handle Autoplay (Intervals & Video) ---
  useEffect(() => {
    const currentSlide = slides[currentIndex];
    const isVideoSlide = isVideo(currentSlide.image);
    const currentVideo = videoRefs.current[currentIndex];

    // 1. Video Playback Control
    if (isVideoSlide) {
      if (currentVideo) {
        if (isPaused) {
          currentVideo.pause();
        } else {
          currentVideo.play().catch((e) => console.log("Autoplay blocked:", e));
        }
      }
      return; // Exit here, video handles its own timing
    }

    // 2. Image Timer Control
    if (isPaused) return; // Do nothing if paused

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
  }, [currentIndex, slides, isPaused]); // This effect reacts to isPaused changing

  return (
    <div
      className="h-[400px] md:h-[550px] w-full m-auto relative group bg-white"
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
                  onEnded={nextSlide}
                  onTimeUpdate={(e) => {
                    const remaining = Math.ceil(
                      e.target.duration - e.target.currentTime,
                    );
                    if (remaining >= 0 && !isPaused) setTimeLeft(remaining);
                  }}
                  className={`w-full h-full ${slide.object_fit === "contain" ? "object-contain" : "object-cover"} object-center pointer-events-none`}
                />
              ) : (
                <img
                  src={slide.image}
                  alt={slide.title}
                  className={`w-full h-full ${slide.object_fit === "contain" ? "object-contain" : "object-cover"} object-center pointer-events-none`}
                />
              )}

              {/* Clickable Overlay for Pausing */}
              <div
                onClick={() => setIsPaused(!isPaused)}
                className="absolute inset-0 bg-black/5 cursor-pointer pointer-events-auto group/pausebox"
              >
                {/* Custom Hover/Pause Badge */}
                <div
                  className={`
        absolute bottom-12 left-1/2 -translate-x-1/2 
        transform transition-all duration-300 pointer-events-none
        ${isPaused ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover/pausebox:opacity-100 group-hover/pausebox:scale-100"}
        bg-black/45 text-white px-5 py-2.5 rounded-full backdrop-blur-md shadow-lg font-bold text-xs tracking-wide flex items-center gap-2
    `}
                >
                  {isPaused ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Pause
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* --- ACTION BUTTON OVERLAY --- */}
            {slide.link && (
              <div className="absolute bottom-12 md:bottom-10 left-0 w-full flex px-53 z-30 pointer-events-none">
                <a
                  href={slide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-bold py-2.5 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 pointer-events-auto"
                >
                  Learn More
                </a>
              </div>
            )}

            {/* 2. TIMER DISPLAY (Top Right) */}
            <div className="absolute top-4 right-4 z-30 pointer-events-none">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 transition-all">
                <span className="text-white text-xs font-bold notranslate">
                  {`${timeLeft}s`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* NAVIGATION CONTROLS */}
      <button
        onClick={prevSlide}
        className="hidden group-hover:flex absolute top-1/2 left-4 -translate-y-1/2 z-30 items-center justify-center w-10 h-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/60 transition-all duration-300 pointer-events-auto"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="hidden group-hover:flex absolute top-1/2 right-4 -translate-y-1/2 z-30 items-center justify-center w-10 h-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/60 transition-all duration-300 pointer-events-auto"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>

      {/* PROGRESS DOTS */}
      <div className="flex justify-center py-2 absolute bottom-4 left-0 right-0 z-30 pointer-events-auto">
        {slides.map((_, slideIndex) => (
          <div
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`h-1.5 rounded-full mx-1 cursor-pointer transition-all duration-300 ${
              currentIndex === slideIndex
                ? "w-6 bg-blue-500"
                : "w-1.5 bg-gray-400 hover:bg-blue-400"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}

export default Carousel;
