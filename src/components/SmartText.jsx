import React, { memo } from 'react';
import { useGoogleLang } from '../hooks/useGoogleLang';

const SmartText = ({ en, ml, children, className = "" }) => {
    const currentLang = useGoogleLang();
    const englishText = en || children;

    // 1. Malayalam custom text
    if (currentLang === 'ml' && ml) {
        return (
            <span className={`notranslate ${className}`}>
                {ml}
            </span>
        );
    }

    // 2. English / Other languages
    // FIX: Always wrap in a span to give React a stable parent node
    return (
        <span className={className}>
            {englishText}
        </span>
    );
};

export default memo(SmartText);