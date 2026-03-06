import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Polyfill Buffer for OPNet SDK browser compatibility
            buffer: 'buffer',
        },
    },
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        include: ['buffer'],
        esbuildOptions: {
            target: 'esnext',
        },
    },
    build: {
        target: 'esnext',
    },
});
