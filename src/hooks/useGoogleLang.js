import { useState, useEffect } from 'react';

export function useGoogleLang() {
    const [lang, setLang] = useState('en');

    useEffect(() => {
        // Function to read the Google Cookie
        const checkCookie = () => {
            const cookies = document.cookie.split(';');
            const gCookie = cookies.find(c => c.trim().startsWith('googtrans='));
            if (gCookie) {
                // Cookie looks like: /en/ml
                const val = gCookie.split('=')[1]; 
                const targetLang = val.split('/').pop(); // Get the last part ('ml')
                setLang(targetLang);
            } else {
                setLang('en');
            }
        };

        // 1. Check immediately
        checkCookie();

        // 2. Check every second (Because Google Widget doesn't emit nice events)
        const interval = setInterval(checkCookie, 1000);

        return () => clearInterval(interval);
    }, []);

    return lang;
}