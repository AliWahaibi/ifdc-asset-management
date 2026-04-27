import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatFileUrl(rawUrl: string | undefined | null): string {
    if (!rawUrl) return '';
    
    // If it's already an absolute URL, return it as is
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:')) {
        return rawUrl;
    }

    // 1. Strip hardcoded local domains if present
    const cleanUrl = rawUrl.replace(/^http:\/\/localhost:8080/, '');
    
    // Ensure cleanUrl starts with / if it doesn't already
    const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    
    // 2. Upload paths (/uploads/...) are served directly by nginx proxy,
    //    NOT through the /api base. Return them as relative paths.
    if (path.startsWith('/uploads/')) {
        return path;
    }
    
    // 3. For other paths, prepend the API base URL
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${path}`;
}
