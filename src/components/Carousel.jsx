import React, { useState, useEffect } from 'react';


function Carousel({ slides }) {
    if (!slides || slides.length === 0) return null;

    const [currentIndex, setCurrentIndex] = useState(0);

    // 2. Logic to go to the previous slide
    const prevSlide = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    // 3. Logic to go to the next slide
    const nextSlide = () => {
        const isLastSlide = currentIndex === slides.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    // 4. Logic for the dots
    const goToSlide = (slideIndex) => {
        setCurrentIndex(slideIndex);
    };

    //Autoplay
    useEffect(() => {
        // Set a timer to run nextSlide after 3000 milliseconds (3 seconds)
        const slideInterval = setInterval(() => {
            nextSlide();
        }, 5000);

        // Cleanup: Clear the interval if the component unmounts or if the user clicks manually
        // This prevents multiple timers from running at once
        return () => clearInterval(slideInterval);
    }, [currentIndex]);

    return (
        <div className='max-w-[1500px] h-[800px] w-full m-auto py-16 px-4 relative group'>

            {/* MAIN CONTAINER */}
            <div className='w-full h-full rounded-2xl relative overflow-hidden bg-slate-900 shadow-2xl'>

                {slides.map((slide, index) => (
                    // SLIDE WRAPPER
                    <div
                        key={index}
                        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >

                        {/* 1. IMAGE LAYER (Full Width, sits behind text) */}
                        <div className="absolute inset-0 w-full h-full">
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="w-full h-full object-cover object-center"
                            />
                        </div>

                        {/* 2. TEXT LAYER (Left Half, with Gradient Background) */}
                        {/* - w-full md:w-3/5: Text takes 60% width on desktop for a nice blend.
                            - bg-gradient-to-r: Creates the fade from Dark (Left) to Transparent (Right).
                        */}
                        <div className="absolute top-0 left-0 w-full md:w-3/5 h-full bg-gradient-to-r from-black via-black/70 to-transparent flex flex-col justify-center p-8 md:p-16 text-white z-20">

                            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight drop-shadow-lg">
                                {slide.title}
                            </h2>

                            <p className="text-gray-200 text-lg md:text-xl mb-8 leading-relaxed drop-shadow-md max-w-lg">
                                {slide.description}
                            </p>

                            {slide.link && (
                                <a
                                    href={slide.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all w-fit shadow-lg hover:shadow-blue-500/30 inline-block mt-6"
                                >
                                    Learn More
                                </a>
                            )}
                        </div>

                    </div>
                ))}

            </div>

            {/* Arrows */}
            <div className='hidden group-hover:block absolute top-[50%] -translate-x-0 translate-y-[-50%] left-6 z-10 text-4xl rounded-full p-2 text-white cursor-pointer  hover:bg-size/100 transition-all'>
                <button onClick={prevSlide}>❮</button>
            </div>
            <div className='hidden group-hover:block absolute top-[50%] -translate-x-0 translate-y-[-50%] right-6 z-10 text-4xl rounded-full p-2 text-white cursor-pointer  hover:bg-size/100 transition-all'>
                <button onClick={nextSlide}>❯</button>
            </div>

            {/* Dots */}
            <div className='flex top-[85%] left-[50%] justify-center py-2 absolute z-10'>
                {slides.map((_, slideIndex) => (
                    <div
                        key={slideIndex}
                        onClick={() => goToSlide(slideIndex)}
                        className={`text-2xl cursor-pointer mx-1 ${currentIndex === slideIndex ? 'text-blue-500' : 'text-gray-400'}`}
                    >
                        ●
                    </div>
                ))}
            </div>

        </div>
    );
}

export default Carousel