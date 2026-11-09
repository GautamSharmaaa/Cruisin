import {expect,test,type APIRequestContext,type Locator,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {ApiEnvelope,PaginatedResult} from '../types/api.types';
import type {ApiProduct} from '../lib/product-mapper';
const api=process.env.PLAYWRIGHT_API_URL??'http://127.0.0.1:8192/api/v1';
async function catalog(request:APIRequestContext):Promise<ApiEnvelope<PaginatedResult<ApiProduct>>>{const response=await request.get(api+'/products?limit=100');expect(response.ok()).toBe(true);return await response.json() as ApiEnvelope<PaginatedResult<ApiProduct>>;}
async function openGallery(page:Page,request:APIRequestContext):Promise<{card:Locator;gallery:Locator;viewport:Locator;product:ApiProduct}>{
 const payload=await catalog(request),product=payload.data.items.find(item=>new Set(item.images.map(image=>image.url)).size>=3);
 if(!product)throw new Error('Local acceptance needs a public product with three photos');
 await page.goto('/shop?q='+encodeURIComponent(product.title));
 const card=page.locator('.editorial-product-card').filter({has:page.getByRole('group',{name:'Images of '+product.title,exact:true})}).first();
 await card.scrollIntoViewIfNeeded();await expect.poll(()=>card.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 const gallery=card.locator('.product-card-gallery'),viewport=gallery.locator('.product-card-gallery-viewport');
 await expect(gallery).toHaveAttribute('data-image-count','3');return{card,gallery,viewport,product};
}
async function settled(viewport:Locator,index:number):Promise<void>{await expect.poll(()=>viewport.evaluate((element,position)=>{const slide=element.querySelectorAll('.product-card-gallery-slide')[position];return Math.abs(slide.getBoundingClientRect().left-element.getBoundingClientRect().left);},index)).toBeLessThan(1);}
async function touch(page:Page,x1:number,y1:number,x2:number,y2:number):Promise<void>{
 const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});
 for(let step=1;step<=10;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*step/10,y:y1+(y2-y1)*step/10}]});await page.waitForTimeout(25);}
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
}

test('desktop arrows and keyboard browse real card photos, and a normal photo click opens the product',async({page,request})=>{
 const {card,gallery,viewport,product}=await openGallery(page,request);const starting=page.url();
 await expect(gallery.locator('img')).toHaveCount(3);
 await card.hover();await gallery.getByRole('button',{name:/Next image/}).click();await expect(gallery).toHaveAttribute('data-active-image','2');await expect(page).toHaveURL(starting);await expect(gallery.getByRole('progressbar')).toHaveAttribute('aria-valuenow','2');await settled(viewport,1);
 await viewport.focus();await page.keyboard.press('End');await expect(gallery).toHaveAttribute('data-active-image','3');await page.keyboard.press('Home');await expect(gallery).toHaveAttribute('data-active-image','1');await page.keyboard.press('ArrowRight');await expect(gallery).toHaveAttribute('data-active-image','2');
 await page.keyboard.press('Home');await expect(gallery).toHaveAttribute('data-active-image','1');await viewport.hover();const wheelWidth=await viewport.evaluate(el=>el.clientWidth);await page.mouse.wheel(wheelWidth*.7,0);await expect(gallery).toHaveAttribute('data-active-image','2');
 expect((await new AxeBuilder({page}).include('.editorial-product-card').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 await mkdir(resolve('../docs/qa/screenshots'),{recursive:true});await settled(viewport,1);await card.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-card-gallery-desktop.png')});
 await gallery.locator('.product-card-gallery-slide[aria-hidden="false"] a').click();await expect(page).toHaveURL(new RegExp('/product/'+product.slug+'$'));
});

test('mouse dragging suppresses product navigation and leaves quick add usable',async({page,request})=>{
 const {card,gallery,viewport}=await openGallery(page,request),starting=page.url();const bounds=await viewport.boundingBox();if(!bounds)throw new Error('Missing gallery');
 await page.mouse.move(bounds.x+bounds.width*.8,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+bounds.height*.5,{steps:12});await page.mouse.up();
 await expect(gallery).toHaveAttribute('data-active-image','2');await expect(page).toHaveURL(starting);
 await settled(viewport,1);await card.getByRole('button',{name:/^Quick add:/}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('button',{name:'Add to bag',exact:true})).toBeDisabled();await page.getByRole('dialog').getByRole('button',{name:'Close quick add',exact:true}).click();await expect(page.getByRole('dialog')).toBeHidden();
});

test.describe('native touch gallery',()=>{
 test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 test('horizontal swipes change photos while vertical swipes scroll the page',async({page,request})=>{
  const {card,gallery,viewport}=await openGallery(page,request),starting=page.url();let bounds=await viewport.boundingBox();if(!bounds)throw new Error('Missing gallery');
  await touch(page,bounds.x+bounds.width*.8,bounds.y+bounds.height*.5,bounds.x+bounds.width*.2,bounds.y+bounds.height*.5);
  await expect(gallery).toHaveAttribute('data-active-image','2');await expect(page).toHaveURL(starting);await settled(viewport,1);
  await mkdir(resolve('../docs/qa/screenshots'),{recursive:true});await card.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-card-gallery-mobile.png')});
  bounds=await viewport.boundingBox();if(!bounds)throw new Error('Missing gallery');const before=await page.evaluate(()=>scrollY);
  await touch(page,bounds.x+bounds.width*.5,bounds.y+bounds.height*.7,bounds.x+bounds.width*.5,bounds.y+bounds.height*.7-120);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+30);await expect(gallery).toHaveAttribute('data-active-image','2');await expect(page).toHaveURL(starting);
 });
});

test('the active photo survives responsive and window-grid changes, including reduced motion',async({page,request})=>{
 const {card,gallery,viewport}=await openGallery(page,request);await viewport.focus();await page.keyboard.press('ArrowRight');await expect(gallery).toHaveAttribute('data-active-image','2');
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});await expect(gallery).toHaveAttribute('data-active-image','2');await expect.poll(()=>viewport.evaluate(el=>Math.round(el.scrollLeft/el.clientWidth))).toBe(1);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Switch to window grid',exact:true}).click();await expect.poll(()=>viewport.evaluate(el=>Math.round(el.scrollLeft/el.clientWidth))).toBe(1);await expect(gallery).toHaveAttribute('data-active-image','2');
 await page.getByRole('button',{name:'Switch to regular grid',exact:true}).click();await page.getByRole('button',{name:'Open Cruisin quick menu',exact:true}).click();await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');await page.keyboard.press('Escape');await expect(page.locator('html')).toHaveClass(/dark/);await gallery.scrollIntoViewIfNeeded();expect((await new AxeBuilder({page}).include('.editorial-product-card').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);await settled(viewport,1);await card.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-card-gallery-mobile-dark.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await viewport.focus();await page.keyboard.press('End');await expect(gallery).toHaveAttribute('data-active-image','3');await settled(viewport,2);
});

test('single-photo and empty-photo cards keep clean controls and a stable fallback',async({page,request})=>{
 const payload=await catalog(request);const items=payload.data.items.slice(0,2);items[0].images=items[0].images.slice(0,1);items[0].hoverImage=items[0].images[0];items[1].images=[];items[1].hoverImage=null;payload.data={items,total:2,page:1,pages:1};
 await page.route(url=>url.pathname==='/api/v1/products',route=>route.fulfill({json:payload}));await page.goto('/shop');
 const cards=page.locator('.editorial-product-card');await expect(cards).toHaveCount(2);
 for(const card of await cards.all()){await expect(card.locator('.product-card-gallery')).toHaveAttribute('data-image-count','1');await expect(card.locator('.product-card-gallery-progress')).toHaveCount(0);await expect(card.locator('.product-card-gallery-arrows')).toHaveCount(0);}
 await expect(cards.nth(1).locator('.product-card-gallery img')).toHaveAttribute('src',/cruisin-image-fallback/);
 const heights=await cards.locator('.editorial-product-media').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));expect(Math.abs(heights[0]-heights[1])).toBeLessThan(1);
});
