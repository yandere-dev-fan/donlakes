import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, symlink, realpath, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const repo = fileURLToPath(new URL('../',import.meta.url));
const defaults = JSON.parse(await readFile(join(repo,'src/content/managed.json')));
test('публикация атомарна; CI сохраняет цены владельца; ошибка не заменяет сайт', {timeout:30000}, async()=>{
 const dir=await realpath(await mkdtemp(join(tmpdir(),'donozera-publish-')));
 const root=join(dir,'app'),data=join(dir,'data'),web=join(dir,'web');
 const env={...process.env,DONOZERA_ROOT:root,DONOZERA_DATA:data,DONOZERA_WEB:web};
 const run = args=>exec(process.execPath,[join(repo,'deploy/publish.mjs'),...args],{env});
 async function fixture(name,fail=false){
  const source=join(root,name);
  for(const path of ['src/content','scripts','admin','node_modules']) await mkdir(join(source,path),{recursive:true});
  await writeFile(join(source,'src/content/managed.json'),JSON.stringify(defaults));
  await writeFile(join(source,'src/content/galleries.ts'),'export const galleries = {};');
  await cp(join(repo,'scripts/check-site.mjs'),join(source,'scripts/check-site.mjs'));
  await cp(join(repo,'admin/schema.mjs'),join(source,'admin/schema.mjs'));
  await writeFile(join(source,'package.json'),JSON.stringify({type:'module',scripts:{build:'node build.mjs'}}));
  await writeFile(join(source,'build.mjs'),fail?'throw new Error("Intentional failure");':`import fs from 'node:fs';const c=JSON.parse(fs.readFileSync('src/content/managed.json'));fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html','<html><body>Price: '+c.day.price+'</body></html>');`);
  return source;
 }
 try{
  const first=await fixture('first'); await run(['--source',first]);
  assert.match(await readFile(join(web,'current/index.html'),'utf8'),/Price: 500/);
  const edited=structuredClone(defaults);edited.day.price=700;
  await writeFile(join(data,'snapshot-test.json'),JSON.stringify(edited));
  await run(['--content',join(data,'snapshot-test.json')]);
  assert.match(await readFile(join(web,'current/index.html'),'utf8'),/Price: 700/);
  assert.equal(JSON.parse(await readFile(join(data,'published.json'))).day.price,700);
  const next=await fixture('next');await run(['--source',next]);
  assert.match(await readFile(join(web,'current/index.html'),'utf8'),/Price: 700/);
  assert.equal(await realpath(join(root,'source')),next);
  const active=await realpath(join(web,'current'));
  await assert.rejects(run(['--source',await fixture('broken',true)]));
  assert.equal(await realpath(join(web,'current')),active);
  assert.equal(await realpath(join(root,'source')),next);
  assert.equal(JSON.parse(await readFile(join(data,'status.json'))).running,false);
  assert.equal(JSON.parse(await readFile(join(data,'published.json'))).day.price,700);
 }finally{await rm(dir,{recursive:true,force:true});}
});
