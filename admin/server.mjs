import http from 'node:http';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { groups, validateContent } from './schema.mjs';

const dataDir = process.env.DONOZERA_DATA || '/var/lib/donozera';
const source = process.env.DONOZERA_SOURCE || '/opt/donozera/source';
const port = Number(process.env.ADMIN_PORT || 8787);
const requireIdentity = process.env.ADMIN_REQUIRE_TAILSCALE !== 'false';
const assetDir = fileURLToPath(new URL('.', import.meta.url));
const csrf = randomBytes(32).toString('hex');
mkdirSync(dataDir, { recursive:true });
const draftPath = join(dataDir, 'draft.json');
const statusPath = join(dataDir, 'status.json');
const atomicJSON = (path, value) => { writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n', { mode:0o600 }); renameSync(`${path}.tmp`, path); };
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
function currentContent() {
  return validateContent(readJSON(existsSync(draftPath) ? draftPath : existsSync(join(dataDir, 'published.json')) ? join(dataDir, 'published.json') : join(source, 'src/content/managed.json')));
}
const revisionOf = content => createHash('sha256').update(JSON.stringify(content)).digest('hex');
function state() {
  const value = existsSync(statusPath) ? readJSON(statusPath) : { running:false };
  return existsSync(join(dataDir, 'ci-running')) ? { ...value, running:true } : value;
}
function send(res, code, value, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type':type, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', 'Referrer-Policy':'same-origin', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
  res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
}
async function body(req) {
  if (req.headers['content-type'] !== 'application/json') throw Object.assign(new Error('Ожидаются данные JSON'), { status:415 });
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw Object.assign(new Error('Слишком большой запрос'), { status:413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw Object.assign(new Error('Некорректный JSON'), { status:400 }); }
}
let activePublish = false;
// A systemd restart can interrupt a build. Never leave its spinner stuck forever.
if (existsSync(statusPath) && readJSON(statusPath).running) {
  const lock = spawnSync('/usr/bin/flock', ['-n', join(dataDir, 'publish.lock'), '/usr/bin/true']);
  if (lock.status === 0) atomicJSON(statusPath, { ...readJSON(statusPath), running:false, error:'Предыдущая публикация была прервана. Проверьте сайт и повторите публикацию.' });
}
http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const identity = req.headers['tailscale-user-login'];
    if (requireIdentity && !identity) return send(res, 403, { error:'Откройте эту страницу через приватный адрес Tailscale' });
    if (req.method === 'GET') {
      if (path === '/api/content') { const content = currentContent(); return send(res, 200, { content, revision:revisionOf(content), csrf, groups, identity:identity || 'локальная проверка' }); }
      if (path === '/api/status') return send(res, 200, state());
      const assets = { '/':['index.html','text/html; charset=utf-8'], '/admin.js':['admin.js','text/javascript; charset=utf-8'], '/admin.css':['admin.css','text/css; charset=utf-8'] };
      if (assets[path]) { const [name, type] = assets[path]; return send(res, 200, readFileSync(join(assetDir, name)), type); }
      return send(res, 404, { error:'Страница не найдена' });
    }
    if (req.method !== 'POST') return send(res, 405, { error:'Метод не поддерживается' });
    const origin = req.headers.origin;
    if (!origin || new URL(origin).host !== req.headers.host) return send(res, 403, { error:'Недопустимый источник запроса' });
    const token = Buffer.from(String(req.headers['x-csrf-token'] || ''));
    if (token.length !== csrf.length || !timingSafeEqual(token, Buffer.from(csrf))) return send(res, 403, { error:'Обновите страницу и повторите действие' });
    const input = await body(req);
    if (input.revision !== revisionOf(currentContent())) return send(res, 409, { error:'Черновик изменился в другой вкладке. Скопируйте свои правки, обновите страницу и повторите.' });
    if (activePublish || state().running) return send(res, 409, { error:'Дождитесь завершения текущей публикации' });
    if (path === '/api/content') { const content = validateContent(input.content); atomicJSON(draftPath, content); return send(res, 200, { content, revision:revisionOf(content) }); }
    if (path === '/api/publish') {
      // A private snapshot prevents later draft edits from changing an in-flight build.
      const snapshot = join(dataDir, `snapshot-${randomBytes(8).toString('hex')}.json`);
      atomicJSON(snapshot, currentContent());
      activePublish = true;
      atomicJSON(statusPath, { ...state(), running:true, error:null, startedAt:new Date().toISOString() });
      const child = spawn('/usr/bin/flock', ['-n', join(dataDir, 'publish.lock'), process.execPath, join(source, 'deploy/publish.mjs'), '--content', snapshot], { stdio:['ignore','pipe','pipe'] });
      let log = '';
      const collect = chunk => { log = (log + chunk.toString()).slice(-100_000); };
      child.stdout.on('data', collect); child.stderr.on('data', collect);
      const finish = code => {
        activePublish = false;
        writeFileSync(join(dataDir, 'last-publish.log'), log, { mode:0o600 });
        if (code !== 0) atomicJSON(statusPath, { ...state(), running:false, error:'Не удалось собрать сайт. Черновик сохранён. Подробности: last-publish.log на сервере.' });
      };
      child.on('error', () => finish(1)); child.on('close', finish);
      return send(res, 202, { running:true });
    }
    return send(res, 404, { error:'Маршрут не найден' });
  } catch(error) { send(res, error.status || 400, { error:error.message }); }
}).listen(port, '127.0.0.1', () => console.log(`Admin listening on 127.0.0.1:${port}; Tailscale identity required: ${requireIdentity}`));
