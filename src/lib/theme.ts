const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle')!;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let chosen: string | null = null;
try { chosen = localStorage.getItem('donozera-theme'); } catch {}
function applyTheme(theme: string) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  toggle.setAttribute('aria-pressed', String(dark));
  toggle.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
  toggle.querySelector('[data-theme-label]')!.textContent = dark ? 'Светлая тема' : 'Тёмная тема';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121f1b' : '#f9f8f3');
}
applyTheme(document.documentElement.dataset.theme || 'light');
toggle.addEventListener('click', () => {
  chosen = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(chosen);
  try { localStorage.setItem('donozera-theme', chosen); } catch {}
});
systemTheme.addEventListener('change', e => { if (chosen !== 'dark' && chosen !== 'light') applyTheme(e.matches ? 'dark' : 'light'); });
window.addEventListener('storage', e => {
  if (e.key !== 'donozera-theme' && e.key !== null) return;
  chosen = e.newValue;
  applyTheme(chosen === 'dark' || chosen === 'light' ? chosen : systemTheme.matches ? 'dark' : 'light');
});
