// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Статический сайт-визитка «Донские озёра».
// SSG-вывод + точечные React-острова для интерактива (галерея, карта, меню).
// Публичная статика обслуживается Nginx; админка работает отдельно через Tailscale.
export default defineConfig({
  site: 'https://donozera.ru',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [sitemap({ filter: (page) => !page.includes("map-review") })],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
});
