import { useState, useEffect } from 'react';

export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        // Set the initial layout immediately 
        setMatches(media.matches);

        // Listen for change events on the media query directly
        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

export function useIsMobile() {
    return useMediaQuery('(max-width: 768px)');
}
