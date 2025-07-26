import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: './', // Use relative paths for Electron
  plugins: [preact()],
}); 