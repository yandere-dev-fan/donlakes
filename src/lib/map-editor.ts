import { places } from '../content/places';
import { roads, smoothRoad, walkingPaths, mapView, mapStorageKey, readMapEdits, type MapEdits, type Point } from '../content/map-geometry';
const select=document.querySelector<HTMLSelectElement>('#edit-object')!;
const canvas=document.querySelector<HTMLElement>('#edit-canvas')!;
const pins=document.querySelector<SVGSVGElement>('#editor-pins')!;
const status=document.querySelector<HTMLElement>('#edit-status')!;
let edits=readMapEdits();
let history: MapEdits[]=[];
let draft: Point[]=[];
const ns='http://www.w3.org/2000/svg';
function checkpoint(){history.push(structuredClone(edits));if(history.length>50)history.shift();}
function render(){
 pins.replaceChildren();
 for(const p of places){
  if(p.locationPending && !edits.points[p.id]) continue;
  const xy=edits.points[p.id]||[p.x,p.y];
  const location=[xy[0]+p.pinX-p.x,xy[1]+p.pinY-p.y];
  const g=document.createElementNS(ns,'g');g.setAttribute('transform',`translate(${location[0]} ${location[1]})`);
  const circle=document.createElementNS(ns,'circle');circle.setAttribute('r',p.id===select.value?'22':'16');circle.setAttribute('fill',p.id===select.value?'#a87936':'#203e35');circle.setAttribute('stroke','#fff');circle.setAttribute('stroke-width','3');
  const text=document.createElementNS(ns,'text');text.setAttribute('text-anchor','middle');text.setAttribute('dy','5');text.setAttribute('fill','#fff');text.setAttribute('font-size','15');text.textContent=p.number;g.append(circle,text);pins.append(g);
  canvas.querySelector(`[data-feature="${p.id}"]`)?.setAttribute('transform',`translate(${xy[0]} ${xy[1]})`);
 }
 const beach=places.find(p=>p.id==='beach')!, volleyball=places.find(p=>p.id==='volleyball')!;
 for(const [id,d] of Object.entries(walkingPaths(edits.points.beach||[beach.x,beach.y],edits.points.volleyball||[volleyball.x,volleyball.y]))) canvas.querySelectorAll(`[data-walkway="${id}"]`).forEach(el=>el.setAttribute('d',d));
 for(const [id,r] of Object.entries(roads))canvas.querySelectorAll(`[data-road="${id}"]`).forEach(el=>el.setAttribute('d',smoothRoad(edits.roads[id]||r.points)));
 for(const point of draft){const c=document.createElementNS(ns,'circle');c.setAttribute('cx',String(point[0]));c.setAttribute('cy',String(point[1]));c.setAttribute('r','6');c.setAttribute('fill','#a87936');pins.append(c);}
 document.querySelector<HTMLButtonElement>('#undo-point')!.disabled=!history.length;
 document.querySelector<HTMLButtonElement>('#reset-road')!.hidden=!select.value.startsWith('road:');
}
select.addEventListener('change',()=>{draft=[];document.querySelector('#edit-help')!.textContent=select.value.startsWith('road:')?'Нажимай по порядку: начало дороги, повороты, конец. После второй точки появится новая линия.':'Нажми на настоящее место выбранного объекта. Повторный клик передвинет метку.';render();});
let start: Point=[0,0];
canvas.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
canvas.addEventListener('click',e=>{
 if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>8)return;
 const r=canvas.getBoundingClientRect();const point:Point=[Math.round(mapView.x+(e.clientX-r.left)/r.width*mapView.width),Math.round(mapView.y+(e.clientY-r.top)/r.height*mapView.height)];
 checkpoint();
 if(select.value.startsWith('road:')){draft.push(point);if(draft.length>=2)edits.roads[select.value.slice(5)]=[...draft];status.textContent=draft.length===1?'Начало дороги отмечено. Теперь нажми следующий поворот или конец.':'Дорога обновлена. Можно добавить ещё повороты или применить изменения.';}
 else{edits.points[select.value]=point;status.textContent='Метка переставлена. Нажми «Применить в предпросмотре», затем скопируй разметку в чат.';}
 render();
});
document.querySelector('#undo-point')!.addEventListener('click',()=>{const previous=history.pop();if(previous)edits=previous;draft=[];render();status.textContent='Последняя правка отменена.';});
document.querySelector('#reset-road')!.addEventListener('click',()=>{checkpoint();delete edits.roads[select.value.slice(5)];draft=[];render();status.textContent='Теперь укажи начало и следующие точки дороги.';});
function save(){try{localStorage.setItem(mapStorageKey,JSON.stringify(edits));status.textContent='Сохранено в этом браузере. Открой главную карту — правки уже там. Пришли разметку в чат, чтобы сохранить её в сайте.';return true;}catch{status.textContent='Браузер не разрешил локальное сохранение. Скопируй разметку и пришли в чат.';return false;}}
document.querySelector('#save-map')!.addEventListener('click',save);
document.querySelector('#copy-map')!.addEventListener('click',async()=>{
 const notes=Object.entries(edits.points).map(([id,p])=>`${places.find(v=>v.id===id)?.name||id}: x=${p[0]}, y=${p[1]}`);
 const text=['Разметка карты «Донские озёра»',...notes,'',JSON.stringify(edits,null,2)].join('\n');
 const output=document.querySelector<HTMLTextAreaElement>('#export-map')!;output.hidden=false;output.value=text;save();
 try{await navigator.clipboard.writeText(text);status.textContent='Разметка скопирована. Вставь её в чат.';}catch{output.focus();output.select();status.textContent='Скопируй выделенный текст и пришли в чат.';}
});
render();
