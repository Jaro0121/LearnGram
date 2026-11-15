import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps the build portable: it works on GitHub Pages (/LearnGram/),
// at a domain root, and inside a Capacitor/WebView wrapper.
export default defineConfig({ base: './', plugins: [react()] });
