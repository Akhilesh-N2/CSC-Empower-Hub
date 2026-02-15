import React, { useEffect } from 'react';

function GoogleTranslate() {
  useEffect(() => {
    // 1. Define the Settings (From the snippet you provided)
    window.gtranslateSettings = {
      default_language: "en",
      languages: ["en", "ml"], // Added 'ta' (Tamil) just in case  , "hi", "ta"
      wrapper_selector: ".gtranslate_wrapper",
      alt_flags: { "en": "usa"} // Optional: Custom flags
    };

    // 2. Load the Script
    const script = document.createElement("script");
    script.src = "https://cdn.gtranslate.net/widgets/latest/float.js";
    script.defer = true;
    document.body.appendChild(script);

    // Cleanup (optional)
    return () => {
      // It's hard to remove 3rd party scripts cleanly, but we can try to clean the global object
      delete window.gtranslateSettings;
    };
  }, []);

  return (
    <div className="gtranslate_wrapper"></div>
  );
}

export default GoogleTranslate;