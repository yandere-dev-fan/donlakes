// Called under the same flock by the admin and GitLab deployment receiver.
import { cp, mkdir, readFile, writeFile, symlink, rename, rm, realpath } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { validateContent } from '../admin/schema.mjs';

const data = process.env.DONOZERA_DATA || '/var/lib/donozera';
const root = process.env.DONOZERA_ROOT || '/opt/donozera';
const web = process.env.DONOZERA_WEB || '/var/www/donozera';
const args = process.argv.slice(2);
const arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const incoming = arg('--source');
const contentFile = arg('--content');
const id = `${new Date().toISOString().replace(/[^0-9]/g, '')}-${randomBytes(3).toString('hex')}`;
const build = join(root, 'builds', id);
const release = join(web, 'releases', id);
const statusFile = join(data, 'status.json');
const exists = async path => { try { await realpath(path); return true; } catch { return false; } };
async function atomicJSON(path, value) { await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n', { mode:0o600 }); await rename(`${path}.tmp`, path); }
async function link(target, path) { const temp = `${path}.next-${id}`; await symlink(target, temp); await rename(temp, path); }
async function run(command, argv, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, argv, { cwd, stdio:'inherit', env:{...process.env, ASTRO_TELEMETRY_DISABLED:'1', NODE_ENV:'production', NODE_OPTIONS:'--max-old-space-size=1024'} });
    const timeout = setTimeout(() => { child.kill('SIGTERM'); }, 180_000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`${command} failed: ${code}`)); });
  });
}
await mkdir(data, { recursive:true });
let previous = {};
try { previous = JSON.parse(await readFile(statusFile, 'utf8')); } catch {}
await atomicJSON(statusFile, { ...previous, running:true, error:null, startedAt:new Date().toISOString() });
try {
  const source = await realpath(incoming || join(root, 'source'));
  const selected = contentFile || (await exists(join(data, 'published.json')) ? join(data, 'published.json') : join(source, 'src/content/managed.json'));
  const content = validateContent(JSON.parse(await readFile(selected, 'utf8')));
  await mkdir(build, { recursive:true });
  await cp(source, build, { recursive:true, filter:path => !['node_modules', 'dist', '.git', '.astro', '.deploy', 'photos', 'test-results', 'playwright-report'].includes(basename(path)) });
  await symlink(join(source, 'node_modules'), join(build, 'node_modules'));
  await atomicJSON(join(build, 'src/content/managed.json'), content);
  await run('npm', ['run', 'build'], build);
  await run('node', ['scripts/check-site.mjs', 'dist'], build);
  // Private source and review pages never go into a public release.
  await rm(join(build, 'dist/map-review'), { recursive:true, force:true });
  await mkdir(release, { recursive:true });
  await cp(join(build, 'dist'), join(release, 'site'), { recursive:true });
  await atomicJSON(join(release, 'content.json'), content);
  if (await exists(join(web, 'current'))) {
    const oldSite = await realpath(join(web, 'current'));
    // Visitors holding the previous HTML can still load its hashed assets.
    if (await exists(join(oldSite, '_astro'))) await cp(join(oldSite, '_astro'), join(release, 'site/_astro'), { recursive:true, force:false });
    await link(oldSite, join(web, 'previous'));
  }
  if (incoming) await link(source, join(root, 'source'));
  await link(join(release, 'site'), join(web, 'current'));
  // Preserve the /current/../ traversal: it must follow the active symlink first.
  await link(`${web}/current/../content.json`, join(data, 'published.json'));
  await atomicJSON(statusFile, { running:false, error:null, publishedAt:new Date().toISOString(), release:id });
  console.log(`Published ${id}`);
} catch(error) {
  await atomicJSON(statusFile, { ...previous, running:false, error:'Ошибка сборки. Действующая версия сайта сохранена.' });
  console.error(error);
  process.exitCode = 1;
} finally {
  await rm(build, { recursive:true, force:true });
  if (contentFile?.startsWith(join(data, 'snapshot-'))) await rm(contentFile, { force:true });
}
