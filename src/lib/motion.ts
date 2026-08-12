/**
 * Обёртки над Motion One + IntersectionObserver для scroll-reveal, каскадов и параллакса.
 *
 * Правила движения (см. план / раздел 4 спеки):
 *  - Анимируем только transform/opacity → 60fps.
 *  - reduce-motion: reveal мгновенный, параллакс отключён (CSS уже глушит [data-reveal]).
 *  - Reveal срабатывает один раз при входе в вьюпорт.
 *
 * Разметка (декларативно, без ручного JS в компонентах):
 *  [data-reveal]                 — элемент, всплывающий снизу при появлении.
 *  [data-reveal-group]           — контейнер: его дети с [data-reveal] идут каскадом.
 *  [data-reveal-delay="60"]      — задержка каскада между детьми, мс (по умолчанию 80).
 *  [data-parallax="0.2"]         — сдвиг по Y пропорционально прогрессу скролла (доля).
 */
import { onTick, motionDisabled } from './lenis';

function revealNow(el: Element) {
  el.classList.add('is-visible');
}

export function initReveal(): void {
  if (typeof window === 'undefined') return;

  const reduced = motionDisabled();
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(revealNow);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;

        if (entry.isIntersecting) {
          // Каскад: задержку берём из позиции внутри ближайшей группы
          const group = el.closest<HTMLElement>('[data-reveal-group]');
          let delay = 0;
          if (group) {
            const step = Number(group.dataset.revealDelay ?? 80);
            const groupItems = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]'));
            delay = groupItems.indexOf(el) * step;
          } else if (el.dataset.revealDelay) {
            delay = Number(el.dataset.revealDelay);
          }
          window.setTimeout(() => el.classList.add('is-visible'), delay);
          observer.unobserve(el);
          return;
        }

        // Элемент уже выше вьюпорта (быстрый скролл / переход по якорю мимо него) —
        // показываем сразу, без анимации, чтобы не осталось «дыр».
        const rootTop = entry.rootBounds?.top ?? 0;
        if (entry.boundingClientRect.bottom <= rootTop) {
          revealNow(el);
          observer.unobserve(el);
        }
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
  );

  items.forEach((el) => observer.observe(el));
}

export function initParallax(): void {
  if (typeof window === 'undefined' || motionDisabled()) return;

  const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (!layers.length) return;

  // Кэш геометрии, чтобы не дёргать layout каждый кадр
  type Layer = { el: HTMLElement; factor: number; top: number; height: number };
  let cache: Layer[] = [];

  const measure = () => {
    cache = layers.map((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return { el, factor: Number(el.dataset.parallax) || 0.15, top, height: rect.height };
    });
  };
  measure();
  window.addEventListener('resize', measure, { passive: true });

  onTick(() => {
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    for (const l of cache) {
      // прогресс: -1 (элемент ниже экрана) → 1 (выше экрана)
      const progress = (scrollY + vh - l.top) / (vh + l.height) - 0.5;
      const shift = progress * l.factor * l.height;
      l.el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    }
  });
}
