import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        allowedHosts: [
            '4a40-49-207-235-116.ngrok-free.app', // Add your ngrok URL here
        ],
         host: true,
    },
});
