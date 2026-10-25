import { test, expect } from '@playwright/test';

test('карта: масштаб, перетаскивание, выбор объекта и полный экран', async ({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  const canvas=page.locator('#territory-map');
  await expect(page.locator('.map-ready')).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await expect(page.locator('#territory')).toHaveCSS('opacity','1');
  await expect(page.locator('#map-zoom')).toHaveText('100%');
  const initialZoom=Number(await canvas.getAttribute('data-zoom'));
  await page.getByRole('button',{name:'Приблизить карту',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThan(initialZoom);
  await page.getByRole('button',{name:'Отдалить карту',exact:true}).click();
  await expect(page.locator('#map-zoom')).toHaveText('100%');
  await page.getByRole('button',{name:'Приблизить карту',exact:true}).click();
  await page.getByRole('button',{name:'Приблизить карту',exact:true}).click();
  const center=await canvas.getAttribute('data-center');
  const title=await page.locator('#place-title').textContent();
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+box.width*.35,box.y+box.height*.6);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.45,{steps:15});await page.mouse.up();
  await expect.poll(()=>canvas.getAttribute('data-center')).not.toBe(center);
  await expect(page.locator('#place-title')).toHaveText(title!);
  await page.getByRole('button',{name:'Вся территория',exact:true}).click();
  await expect(page.locator('#map-zoom')).toHaveText('100%');
  await page.locator('.map-cluster:visible').first().click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThan(initialZoom);
  await page.getByRole('button',{name:'Вся территория',exact:true}).click();
  await expect(page.locator('#map-zoom')).toHaveText('100%');
  await page.locator('#place-select').selectOption('object-18');
  await expect(page.locator('#place-title')).toHaveText('Баня № 2');
  await expect(page.locator('.map-pin[data-place="object-18"]')).toBeVisible();
  await expect(page.locator('.map-pin[data-place="object-18"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Развернуть карту',exact:true}).click();
  await expect(page.locator('#map-expanded-dialog')).toBeVisible();
  const expanded=(await canvas.boundingBox())!;
  expect(expanded.width).toBeGreaterThan(200);expect(expanded.height).toBeGreaterThan(200);
  await page.locator('.map-photo').click();
  await expect(page.locator('#gallery-dialog')).toBeVisible();
  await page.locator('#gallery-image').evaluate((el:HTMLImageElement)=>el.decode());
  await page.keyboard.press('Escape');
  await expect(page.locator('#gallery-dialog')).not.toBeVisible();
  await expect(page.locator('#map-expanded-dialog')).toBeVisible();
  await page.getByRole('button',{name:'Вся территория',exact:true}).click();
  await expect(page.locator('#map-zoom')).toHaveText('100%');
  await page.keyboard.press('Escape');
  await expect(page.locator('#map-expanded-dialog')).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Развернуть карту',exact:true})).toBeFocused();
  expect(errors).toEqual([]);
});

test('настоящие touch-жесты: перемещение и pinch-to-zoom',async({page,context},info)=>{
  test.skip(info.project.name!=='mobile','Проверяется на устройстве с touch');
  await page.goto('/');
  const canvas=page.locator('#territory-map');await expect(page.locator('.map-ready')).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Приблизить карту',exact:true}).click();
  await expect(page.locator('#map-zoom')).not.toHaveText('100%');
  const box=(await canvas.boundingBox())!;
  const cdp=await context.newCDPSession(page);
  const beforeCenter=await canvas.getAttribute('data-center');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.3,y:box.y+box.height*.6,id:1}]});
  for(let i=1;i<=10;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.3+i*.025),y:box.y+box.height*(.6-i*.01),id:1}]});
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>canvas.getAttribute('data-center')).not.toBe(beforeCenter);
  const beforeZoom=Number(await canvas.getAttribute('data-zoom'));
  const cx=box.x+box.width*.45,cy=box.y+box.height*.55;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-25,y:cy,id:1},{x:cx+25,y:cy,id:2}]});
  for(let i=1;i<=10;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-25-i*5,y:cy,id:1},{x:cx+25+i*5,y:cy,id:2}]});
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThan(beforeZoom);
  await cdp.detach();
});

test('кнопки и SVG-иконки на узких экранах',async({page},info)=>{
  test.skip(info.project.name!=='mobile','Проверяются узкие экраны');
  for(const width of [320,360,390,600,768]){
    await page.setViewportSize({width,height:844});await page.goto('/');
    await expect(page.locator('.quick-actions button svg')).toHaveCount(2);
    await expect(page.locator('.quick-actions a svg')).toHaveCount(1);
    const boxes=await page.locator('.quick-actions>a,.quick-actions>button').evaluateAll(elements=>elements.map(el=>{const b=el.getBoundingClientRect();return{x:b.x,right:b.right,y:b.y,width:b.width,height:b.height,overflow:el.scrollWidth>el.clientWidth};}));
    expect(boxes).toHaveLength(2);expect(boxes[0].overflow).toBe(false);expect(boxes[1].overflow).toBe(false);
    expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].x);expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(1);
    expect(Math.abs(boxes[0].width-boxes[1].width)).toBeLessThan(1);
    expect(boxes[0].height).toBeGreaterThanOrEqual(44);expect(boxes[1].right).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    const emoji=await page.locator('button,a,.eyebrow,.amenity-strip').evaluateAll(elements=>elements.filter(el=>/\p{Extended_Pictographic}/u.test(el.textContent||'')).map(el=>el.textContent));
    expect(emoji).toEqual([]);
  }
});
