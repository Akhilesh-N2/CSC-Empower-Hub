import { useState, useEffect } from 'react';

export function useGoogleLang() {
    const [lang, setLang] = useState('en');

    useEffect(() => {
        const getGoogleTranslateLang = () => {
            // 1. Check the Cookie
            const cookies = document.cookie.split(';');
            const gCookie = cookies.find(c => c.trim().startsWith('googtrans='));
            
            if (gCookie) {
                const val = gCookie.split('=')[1];
                const targetLang = val.split('/').pop();
                if (targetLang) return targetLang;
            }

            // 2. Fallback: Check the HTML tag (Google often updates this)
            const htmlLang = document.documentElement.lang;
            if (htmlLang && htmlLang !== 'en') return htmlLang;

            return 'en';
        };

        const checkAndUpdate = () => {
            const currentDetected = getGoogleTranslateLang();
            // OPTIMIZATION: Only update state if the language actually changed
            setLang((prev) => (prev !== currentDetected ? currentDetected : prev));
        };

        // Initial check
        checkAndUpdate();

        // Detect changes via MutationObserver (More efficient than setInterval)
        // This watches the <html> tag for attribute changes (like class or lang)
        const observer = new MutationObserver(checkAndUpdate);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'lang']
        });

        // Keep the interval as a safety backup (Google Translate is unpredictable)
        const interval = setInterval(checkAndUpdate, 2000);

        return () => {
            observer.disconnect();
            clearInterval(interval);
        };
    }, []);

    return lang;
}