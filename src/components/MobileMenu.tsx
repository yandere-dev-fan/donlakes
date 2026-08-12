import { useEffect, useRef, useState } from 'react';

interface NavLink {
  label: string;
  href: string;
}

interface Props {
  links: NavLink[];
  phone: string;
  phoneRaw: string;
}

/**
 * Мобильное полноэкранное меню (React-остров).
 * - Ловушка фокуса внутри оверлея, закрытие по Esc и по клику на пункт.
 * - Блокировка скролла body при открытии.
 * - Кнопка-бургер живёт здесь же (виден только на xs–md через CSS в Header).
 */
export default function MobileMenu({ links, phone, phoneRaw }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    const first = focusables?.[0];
    const last = focusables?.[focusables.length - 1];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'Tab' && focusables && focusables.length) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        ref={triggerRef}
        type="button"
        className="mobile-menu__burger"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`mobile-menu__bars ${open ? 'is-open' : ''}`} aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <div
        id="mobile-menu-panel"
        ref={panelRef}
        className={`mobile-menu__overlay ${open ? 'is-open' : ''}`}
        hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Навигация"
      >
        <nav className="mobile-menu__nav">
          <ul>
            {links.map((l, i) => (
              <li key={l.href} style={{ '--i': i } as React.CSSProperties}>
                <a href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="mobile-menu__phone" href={`tel:${phoneRaw}`}>
          <span>Позвонить</span>
          <strong>{phone}</strong>
        </a>
      </div>
    </div>
  );
}
