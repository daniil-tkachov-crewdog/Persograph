import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config: React plugin + default port 5173.
// Kept intentionally minimal — no path aliases, no env plumbing — because
// the app is a single-page local tool with no backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});
