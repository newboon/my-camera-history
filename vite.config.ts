import { presetWind } from '@unocss/preset-wind';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/my-camera-history/' : '/',
  plugins: [
    UnoCSS({
      presets: [presetWind()],
    }),
    react(),
  ],
});
