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
    
    // 2. Prepend dynamic API URL from environment variables
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    // Ensure cleanUrl starts with / if it doesn't already
    const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    
    return `${baseUrl}${path}`;
}
