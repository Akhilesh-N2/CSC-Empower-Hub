import React from 'react';
import { useGoogleLang } from '../hooks/useGoogleLang';

function SmartText({ en, ml, children }) {
    const currentLang = useGoogleLang();
    const englishText = en || children;

    // 1. If User is in Malayalam, show YOUR custom word
    if (currentLang === 'ml' && ml) {
        return (
            <span className="notranslate text-inherit">
                {ml}
            </span>
        );
    }

    // 2. If User is in any other language (English, Hindi, etc.), 
    // just render the English text and let Google auto-translate it.
    return (
        <span>{englishText}</span>
    );
}

export default SmartText;