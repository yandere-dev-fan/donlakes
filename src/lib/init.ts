/**
 * Единая точка запуска клиентского движения.
 * Подключается один раз из BaseLayout как модульный скрипт.
 */
import { initLenis } from './lenis';
import { initReveal, initParallax } from './motion';

function start() {
  initLenis();
  initReveal();
  initParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
