import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { validateContent } from '../admin/schema.mjs';
const defaults = JSON.parse(await readFile(new URL('../src/content/managed.json', import.meta.url)));
let child, dir, base, session;
before(async () => {
  dir = await mkdtemp(join(tmpdir(),'donozera-test-'));
  const probe = net.createServer(); await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port = probe.address().port; await new Promise(resolve=>probe.close(resolve));
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath,['admin/server.mjs'],{env:{...process.env,ADMIN_PORT:String(port),ADMIN_REQUIRE_TAILSCALE:'false',DONOZERA_SOURCE:process.cwd(),DONOZERA_DATA:dir},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('exit',()=>reject(new Error('Admin failed to start')));});
  session = await (await fetch(base+'/api/content')).json();
});
after(async () => { child?.kill(); await rm(dir,{recursive:true,force:true}); });
const post = (path,body,headers={}) => fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-CSRF-Token':session.csrf,...headers},body:JSON.stringify(body)});

test('валидный контент проходит проверку',()=>assert.deepEqual(validateContent(defaults),defaults));
test('пустое описание, отрицательная цена и неверное время отклоняются',()=>{
  for(const change of [d=>d.summer.description='',d=>d.day.price=-1,d=>d.contact.checkIn='25:00',d=>d.contact.dayEnd='05:00']) { const d=structuredClone(defaults); change(d); assert.throws(()=>validateContent(d)); }
});
test('опасная ссылка и неверный телефон отклоняются',()=>{
  for(const url of ['javascript:alert(1)','https://evil.test/','http://yandex.ru/maps','https://user:pass@yandex.ru/']) { const d=structuredClone(defaults); d.contact.mapUrl=url; assert.throws(()=>validateContent(d)); }
  const d=structuredClone(defaults);d.contact.phone='123';assert.throws(()=>validateContent(d));
});
test('цены должны быть целыми и ограничены',()=>{
  for(const value of [1.5,1_000_001,NaN,'500']){const d=structuredClone(defaults);d.day.price=value;assert.throws(()=>validateContent(d));}
});
test('API отдаёт данные без кеширования и с CSP',async()=>{
  const r=await fetch(base+'/');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
});
test('без CSRF или с чужим Origin запись запрещена',async()=>{
  const body={content:defaults,revision:session.revision};
  assert.equal((await post('/api/content',body,{'X-CSRF-Token':''})).status,403);
  assert.equal((await post('/api/content',body,{Origin:'https://evil.test'})).status,403);
});
test('черновик сохраняется; устаревшая вкладка получает 409; опубликованный файл не меняется',async()=>{
  const d=structuredClone(defaults);d.day.price=750;
  const r=await post('/api/content',{content:d,revision:session.revision});assert.equal(r.status,200);const updated=await r.json();assert.equal(updated.content.day.price,750);
  assert.equal((await post('/api/content',{content:defaults,revision:session.revision})).status,409);
  assert.equal(JSON.parse(await readFile(join(dir,'draft.json'))).day.price,750);
  await assert.rejects(readFile(join(dir,'published.json')));
  session=await(await fetch(base+'/api/content')).json();assert.equal(session.content.day.price,750);
});
test('невалидная цена не портит сохранённый черновик',async()=>{
  const d=structuredClone(defaults);d.day.price=-20;
  assert.equal((await post('/api/content',{content:d,revision:session.revision})).status,400);
  assert.equal(JSON.parse(await readFile(join(dir,'draft.json'))).day.price,750);
});
test('попытка прочитать путь вне admin возвращает 404',async()=>assert.equal((await fetch(base+'/schema.mjs')).status,404));
