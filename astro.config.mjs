// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Статический сайт-визитка «Донские озёра».
// SSG-вывод + точечные React-острова для интерактива (галерея, карта, меню).
// Деплой (позже, по отдельному разрешению): сборка на PC → готовая статика на nginx VPS.
export default defineConfig({
  site: 'https://donskie-ozera.example',
  output: 'static',
  integrations: [react(), sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
});
