import { applyMapEdits } from './map-overrides';
import { places } from '../content/places';
import { galleries } from '../content/galleries';
const nav = document.querySelector<HTMLElement>('#navigation');
const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
function closeMenu() { nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); menu?.setAttribute('aria-label', 'Открыть меню'); }
menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню'); nav?.classList.toggle('open', open); });
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if(e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true'){closeMenu();menu.focus();} });
window.matchMedia('(min-width: 851px)').addEventListener('change', e => { if(e.matches) closeMenu(); });
const dialog = document.querySelector<HTMLDialogElement>('#gallery-dialog')!;
const galleryImage = document.querySelector<HTMLImageElement>('#gallery-image')!;
let galleryKey = 'sunsets'; let currentIndex = 0; let opener: HTMLElement | null = null;
const galleryVideo = document.querySelector<HTMLVideoElement>('#gallery-video')!;
const mediaCount = (key: string) => galleries[key].images.length + (galleries[key].videos?.length || 0);
function stopVideo() { galleryVideo.pause(); galleryVideo.removeAttribute('src'); galleryVideo.load(); }
function renderGallery() {
  const g = galleries[galleryKey];
  const isVideo = currentIndex >= g.images.length;
  document.querySelector<HTMLElement>('#gallery-error')!.hidden = true;
  stopVideo();
  galleryImage.hidden = isVideo;
  galleryVideo.hidden = !isVideo;
  if (isVideo) {
    galleryVideo.src = `/videos/${g.videos![currentIndex - g.images.length]}`;
    galleryVideo.setAttribute('aria-label', `${g.title} — видео ${currentIndex - g.images.length + 1}`);
  } else {
    galleryImage.src = `/images/${g.images[currentIndex]}.webp`;
    galleryImage.alt = `${g.alt} — фото ${currentIndex + 1}`;
  }
  document.querySelector('#gallery-title')!.textContent = g.title + (isVideo ? ' · Видео' : '');
  document.querySelector('#gallery-counter')!.textContent = `${currentIndex + 1} / ${mediaCount(galleryKey)}`;
  document.querySelector<HTMLButtonElement>('#gallery-prev')!.disabled = mediaCount(galleryKey) < 2;
  document.querySelector<HTMLButtonElement>('#gallery-next')!.disabled = mediaCount(galleryKey) < 2;
}
function step(direction: number) { const count = mediaCount(galleryKey); currentIndex = (currentIndex + direction + count) % count; renderGallery(); }
document.querySelectorAll<HTMLButtonElement>('.gallery-trigger').forEach(button => button.addEventListener('click', () => { const key = button.dataset.gallery!; if(!galleries[key] || !mediaCount(key)) return; opener = button; galleryKey = key; currentIndex = Math.min(Math.max(0, Number(button.dataset.index) || 0), mediaCount(key) - 1); renderGallery(); dialog.showModal(); document.body.classList.add('gallery-open'); document.querySelector<HTMLButtonElement>('#gallery-close')?.focus(); }));
document.querySelector('#gallery-close')?.addEventListener('click', () => dialog.close());
document.querySelector('#gallery-prev')?.addEventListener('click', () => step(-1));
document.querySelector('#gallery-next')?.addEventListener('click', () => step(1));
dialog.addEventListener('close', () => { stopVideo(); document.body.classList.remove('gallery-open'); opener?.focus(); });
dialog.addEventListener('click', e => { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); });
dialog.addEventListener('keydown', e => { if(e.target === galleryVideo) return; if(e.key === 'ArrowLeft'){e.preventDefault();step(-1);} if(e.key === 'ArrowRight'){e.preventDefault();step(1);} });
let touchStart = 0;
galleryImage.addEventListener('touchstart', e => { touchStart = e.changedTouches[0].clientX; }, {passive:true});
galleryImage.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - touchStart; if(Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }, {passive:true});
function selectPlace(id: string) {
  const p = places.find(p => p.id === id); if (!p) return;
  document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(b => {
    const active = b.dataset.place === p.id;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  const select = document.querySelector<HTMLSelectElement>('#place-select')!;
  select.value = p.id;
  const gallery = p.gallery ? galleries[p.gallery] : null;
  const photoButton = document.querySelector<HTMLButtonElement>('.map-photo')!;
  const image = document.querySelector<HTMLImageElement>('#place-photo')!;
  const media = document.querySelector<HTMLElement>('.map-media')!;
  const photoNote = document.querySelector<HTMLElement>('#place-photo-note')!;
  photoButton.hidden = !gallery?.images.length;
  media.hidden = !gallery?.images.length;
  document.querySelector('.map-detail')?.classList.toggle('without-media', !gallery?.images.length);
  photoNote.hidden = !gallery?.images.length;
  photoNote.textContent = p.photoNote;
  if (gallery?.images.length) {
    image.src = `/images/${gallery.images[0]}.webp`;
    image.alt = gallery.alt;
    photoButton.dataset.gallery = p.gallery!;
    photoButton.setAttribute('aria-label', `Посмотреть фотографии: ${gallery.title}`);
    document.querySelector('#place-photo-count')!.textContent = `1 / ${mediaCount(p.gallery!)}`;
    document.querySelector('#place-media-label')!.textContent = gallery.videos?.length ? 'Фото и видео' : 'Смотреть фото';
  } else {
    image.removeAttribute('src');
    photoButton.removeAttribute('data-gallery');
  }
  document.querySelector('#place-type')!.textContent = `${p.number} / ${p.type}`;
  document.querySelector('#place-title')!.textContent = p.name;
  document.querySelector('#place-description')!.textContent = p.description;
  document.querySelector('#place-details')!.replaceChildren(...p.details.map(detail => {
    const li = document.createElement('li'); li.textContent = detail; return li;
  }));
  // Keep selected markers visible when using the list on a narrow screen.
  const pan = document.querySelector<HTMLElement>('.map-pan')!;
  const marker = document.querySelector<HTMLElement>(`.map-pin[data-place="${p.id}"]`)!;
  if(marker && !marker.hidden) pan.scrollTo({ left: marker.offsetLeft - pan.clientWidth / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(button => button.addEventListener('click', () => selectPlace(button.dataset.place!)));
document.querySelector<HTMLSelectElement>('#place-select')?.addEventListener('change', e => selectPlace((e.target as HTMLSelectElement).value));

applyMapEdits();
window.addEventListener('storage', applyMapEdits);
window.addEventListener('pageshow', applyMapEdits);
selectPlace('object-11');

// Media failures leave the navigation and contact action usable.
for (const media of [galleryImage, galleryVideo]) {
  media.addEventListener('error', () => {
    if (dialog.open && (media === galleryImage || galleryVideo.hasAttribute('src')))
      document.querySelector<HTMLElement>('#gallery-error')!.hidden = false;
  });
}
// Reveal sections once. Without JavaScript, every section stays visible.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  document.querySelectorAll('main > .section, .fishing-section').forEach(section => {
    section.classList.add('reveal-section');
    observer.observe(section);
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      observer.disconnect();
      document.querySelectorAll('.reveal-section').forEach(el => el.classList.add('is-visible'));
    }
  });
}
