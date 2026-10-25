let revision, csrf, dirty = false, publishing = false, content, ready = false;
const form = document.querySelector('#editor');
const save = document.querySelector('#save');
const publish = document.querySelector('#publish');
const status = document.querySelector('#status');
function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
function controls() {
  save.disabled = !ready || !dirty || publishing;
  publish.disabled = !ready || dirty || publishing;
  form.querySelectorAll('input,textarea').forEach(el => { el.disabled = publishing; });
  document.querySelector('#save-note').textContent = !ready ? 'Загрузка…' : publishing ? 'Идёт публикация…' : dirty ? 'Есть несохранённые изменения' : 'Черновик сохранён';
}
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Не удалось выполнить запрос');
  return result;
}
async function refreshStatus() {
  const state = await api('/api/status');
  publishing = state.running;
  if (state.running) message('Собираем и проверяем новую версию. Можно оставить страницу открытой.');
  else if (state.error) message(`Публикация не удалась. Предыдущий сайт работает.\n${state.error}`, true);
  else if (state.publishedAt) message(`Сайт опубликован: ${new Date(state.publishedAt).toLocaleString('ru-RU')}.\nЦены и описания уже доступны посетителям.`);
  else message('Данные загружены. Можно изменить цены и описания.');
  controls();
  if (publishing) setTimeout(() => refreshStatus().catch(error => { message(`${error.message}. Проверим состояние повторно через 5 секунд.`, true); setTimeout(() => refreshStatus().catch(error => message(error.message, true)), 5000); }), 2000);
}
async function init() {
  const data = await api('/api/content');
  ({ revision, csrf, content } = data);
  document.querySelector('#identity').textContent = `Приватный доступ: ${data.identity}`;
  for (const [group, title, fields] of data.groups) {
    const section = document.createElement('fieldset');
    const legend = document.createElement('legend'); legend.textContent = title; section.append(legend);
    for (const [key, title, type] of fields) {
      const label = document.createElement('label'); label.textContent = title;
      const input = document.createElement(type ? 'input' : 'textarea');
      if (type) input.type = type;
      else { label.className = 'wide'; input.maxLength = 3000; }
      if (type === 'number') { input.min = '0'; input.max = '1000000'; input.step = '1'; }
      input.name = `${group}.${key}`; input.value = content[group][key]; input.required = true;
      if (type === 'tel') input.pattern = '\\+7[0-9]{10}';
      label.append(input); section.append(label);
    }
    document.querySelector('#fields').append(section);
  }
  ready = true;
  await refreshStatus();
}
form.addEventListener('input', () => { dirty = true; controls(); });
form.addEventListener('submit', async event => {
  event.preventDefault(); save.disabled = true; publish.disabled = true;
  const next = structuredClone(content);
  for (const input of form.querySelectorAll('input,textarea')) {
    const [group, key] = input.name.split('.'); next[group][key] = input.type === 'number' ? Number(input.value) : input.value;
  }
  try { const data = await api('/api/content', { content:next, revision }); content = data.content; revision = data.revision; dirty = false; message('Черновик сохранён. Нажмите «Опубликовать изменения», чтобы обновить сайт.'); }
  catch(error) { message(error.message, true); }
  controls();
});
publish.addEventListener('click', async () => {
  publishing = true; controls();
  try { await api('/api/publish', { revision }); await refreshStatus(); }
  catch(error) { publishing = false; controls(); message(error.message, true); }
});
window.addEventListener('beforeunload', event => { if(dirty) { event.preventDefault(); event.returnValue = ''; } });
init().catch(error => message(error.message, true));
