// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Статический сайт-визитка «Донские озёра».
// SSG-вывод; галерея, карта и меню используют браузерные модули.
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
