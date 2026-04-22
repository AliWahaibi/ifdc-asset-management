import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatFileUrl(rawUrl: string | undefined | null): string {
    if (!rawUrl) return '';
    
    // 1. Strip hardcoded local domains if present
    const cleanUrl = rawUrl.replace(/^http:\/\/localhost:8080/, '');
    
    // 2. Prepend dynamic API URL from environment variables
    // In dev (vite proxy), VITE_API_URL is typically empty, so it stays relative.
    // In prod, it should be set to the backend domain.
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    return `${baseUrl}${cleanUrl}`;
}
