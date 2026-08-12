/**
 * Инерционный скролл (Lenis) + мост со scroll-reveal.
 *
 * Принципы (см. план):
 *  - Плавность как несущая идея: мягкая инерция, без «резинового» перелёта.
 *  - prefers-reduced-motion → Lenis НЕ запускается вовсе (нативный скролл), reveal мгновенный.
 *  - Единый rAF-цикл: Lenis + параллакс-подписчики тикают из одного кадра.
 */
import Lenis from 'lenis';

type TickHandler = (time: number) => void;

const tickHandlers = new Set<TickHandler>();
let lenis: Lenis | null = null;

export function onTick(handler: TickHandler): () => void {
  tickHandlers.add(handler);
  return () => tickHandlers.delete(handler);
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Движение выключено: системная настройка reduce ИЛИ dev-флаг ?static
 * (используется для аудита раскладки без инерционного скролла).
 */
export function motionDisabled(): boolean {
  return (
    prefersReducedMotion() ||
    (typeof location !== 'undefined' && location.search.includes('static'))
  );
}

export function initLenis(): void {
  if (typeof window === 'undefined') return;

  const reduced = motionDisabled();

  if (!reduced) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    // Плавный переход по внутренним якорям через Lenis
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        lenis!.scrollTo(target as HTMLElement, { offset: -72 });
      });
    });
  }

  // rAF-цикл нужен только при активном движении (Lenis/параллакс).
  // В reduce/static режиме не запускаем — страница «успокаивается», нативный скролл работает.
  if (!reduced) {
    const raf = (time: number) => {
      lenis?.raf(time);
      tickHandlers.forEach((h) => h(time));
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // Dev-хук для отладки/автотестов (в прод-сборку не попадает).
  if (import.meta.env.DEV && lenis) {
    (window as unknown as { lenis?: Lenis }).lenis = lenis;
  }
}
