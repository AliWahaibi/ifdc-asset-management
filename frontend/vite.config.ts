import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
                    ui: ['lucide-react', 'framer-motion', 'react-hot-toast', 'react-hook-form', 'react-select', 'clsx', 'tailwind-merge'],
                    charts: ['recharts'],
                    scanner: ['html5-qrcode'],
                    spline: ['@splinetool/react-spline', '@splinetool/runtime'],
                },
            },
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
})
