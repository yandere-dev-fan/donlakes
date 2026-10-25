import { test, expect } from '@playwright/test';

test('страница, изображения, темы, меню и анимации', async ({page}, info) => {
  const errors:string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText('выдохнуть');
  for (const section of await page.locator('main > section').all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS('opacity','1');
  }
  await page.evaluate(async () => { await Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>i.decode().catch(()=>{}))); });
  const broken = await page.locator('img').evaluateAll(images => images.filter(i=>i.getAttribute('src') && (!i.complete || i.naturalWidth===0)).map(i=>i.getAttribute('src')));
  expect(broken).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const before = await page.locator('html').getAttribute('data-theme');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',before==='dark'?'light':'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme',before==='dark'?'light':'dark');
  if(info.project.name==='mobile') {
    await page.locator('.menu-toggle').click();
    await expect(page.locator('#navigation')).toBeVisible();
    await page.locator('#navigation a[href="#sauna"]').click();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false');
    await expect(page.locator('#navigation')).toBeHidden();
  }
  for (const section of await page.locator('main > section').all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS('opacity','1');
  }
  await page.screenshot({path:`test-results/${info.project.name}-site.png`,fullPage:true});
  expect(errors).toEqual([]);
});

test('все объекты карты и галереи, фотографии и видео', async ({page}) => {
  const errors:string[] = []; page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/');
  const options = await page.locator('#place-select option').evaluateAll(items=>items.map(i=>(i as HTMLOptionElement).value));
  for(const id of options) {
    await page.locator('#place-select').selectOption(id);
    await expect(page.locator('#place-title')).not.toBeEmpty();
    const photo = page.locator('.map-photo');
    if(await photo.isVisible()) {
      await photo.click(); await expect(page.locator('#gallery-dialog')).toBeVisible();
      await expect(page.locator('#gallery-image')).toBeVisible();
      await page.locator('#gallery-image').evaluate((el:HTMLImageElement)=>el.decode());
      await page.keyboard.press('Escape');
      await expect(page.locator('#gallery-dialog')).not.toBeVisible();
    } else {
      await expect(page.locator('.map-media')).toBeHidden();
      await expect(page.locator('#place-empty')).toHaveCount(0);
    }
  }
  const triggers = page.locator('.gallery-trigger:not(.map-photo)');
  for(const trigger of await triggers.all()) {
    await trigger.click();
    await expect(page.locator('#gallery-dialog')).toBeVisible();
    await page.locator('#gallery-image').evaluate((el:HTMLImageElement)=>el.decode());
    await page.locator('#gallery-close').click();
    await expect(trigger).toBeFocused();
  }
  await page.locator('[data-gallery="summer"]').first().click();
  await page.locator('#gallery-prev').click(); // Last item is a video.
  await expect(page.locator('#gallery-video')).toBeVisible();
  await page.locator('#gallery-video').evaluate(async (el:HTMLVideoElement)=> { await el.play(); el.pause(); });
  await page.locator('#gallery-close').click();
  await expect(page.locator('#gallery-video')).not.toHaveAttribute('src');
  expect(errors).toEqual([]);
});

test('reduced motion, клавиатура и 404', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior','auto');
  await expect(page.locator('.reveal-section')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Перейти к содержимому'})).toBeFocused();
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('link',{name:/Вернуться на главную/})).toBeVisible();
});
