import {expect,test,type APIRequestContext,type Locator,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {ApiEnvelope,PaginatedResult} from '../types/api.types';
import type {ApiProduct} from '../lib/product-mapper';
const api=process.env.PLAYWRIGHT_API_URL??'http://127.0.0.1:8192/api/v1';
async function catalog(request:APIRequestContext):Promise<ApiEnvelope<PaginatedResult<ApiProduct>>>{const response=await request.get(api+'/products?limit=100');expect(response.ok()).toBe(true);return await response.json() as ApiEnvelope<PaginatedResult<ApiProduct>>;}
async function openGallery(page:Page,request:APIRequestContext):Promise<{card:Locator;gallery:Locator;viewport:Locator;product:ApiProduct}>{
 const payload=await catalog(request),product=payload.data.items.find(item=>new Set(item.images.map(image=>image.url)).size===3);
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
  await page.waitForTimeout(500);await viewport.scrollIntoViewIfNeeded();bounds=await viewport.boundingBox();if(!bounds)throw new Error('Missing gallery');const lower=await page.evaluate(()=>scrollY);await touch(page,bounds.x+bounds.width*.5,Math.max(200,bounds.y+60),bounds.x+bounds.width*.5,Math.max(200,bounds.y+60)+130);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(lower-30);
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

test('four-photo cards fill the bottom meter at 25, 50, 75 and 100 percent with plain hearts and glass arrows',async({page,request})=>{
 const payload=await catalog(request);const product=payload.data.items.find(p=>p.images.length>=3);if(!product)throw new Error('Four-photo acceptance needs a three-photo local catalog product');product.images=[...product.images.slice(0,3),{url:'/images/department/men-studio.jpg',alt:'Fourth acceptance photo',width:600,height:800}];payload.data={items:[product],total:1,page:1,pages:1};await page.route(url=>url.pathname==='/api/v1/products',route=>route.fulfill({json:payload}));await page.goto('/shop');const card=page.locator('.editorial-product-card').first(),gallery=card.locator('.product-card-gallery'),progress=gallery.getByRole('progressbar'),viewport=gallery.locator('.product-card-gallery-viewport');await expect(gallery).toHaveAttribute('data-image-count','4');
 const heart=card.getByRole('button',{name:'Add to wishlist',exact:true});expect(await heart.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');expect(await progress.evaluate(el=>getComputedStyle(el,'::after').transitionDuration)).toBe('0.4s');
 await viewport.focus();for(let index=0;index<4;index++){if(index)await page.keyboard.press('ArrowRight');await expect(gallery).toHaveAttribute('data-active-image',String(index+1));await expect.poll(()=>progress.evaluate(el=>Number(getComputedStyle(el,'::after').transform.match(/matrix\(([^,]+)/)?.[1]??0))).toBeCloseTo((index+1)/4,2);}
 const line=await progress.boundingBox(),media=await card.locator('.editorial-product-media').boundingBox();expect(Math.abs(line!.y+line!.height-media!.y-media!.height)).toBeLessThan(1);await card.hover();expect(await gallery.locator('.product-card-gallery-arrows button').first().evaluate(el=>getComputedStyle(el).backdropFilter)).toContain('blur');
 await mkdir(resolve('../docs/qa/screenshots'),{recursive:true});await settled(viewport,3);await card.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-card-glass-progress-desktop.png')});await page.setViewportSize({width:390,height:844});await card.scrollIntoViewIfNeeded();await card.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-card-glass-progress-mobile.png')});
});


test('vertical wheel over a product image scrolls down and up without changing photos',async({page,request})=>{
 const {gallery,viewport}=await openGallery(page,request);await viewport.hover();const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,360);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+100);await page.waitForTimeout(600);const lower=await page.evaluate(()=>scrollY);await viewport.hover();await page.mouse.wheel(0,-260);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(lower-70);await expect(gallery).toHaveAttribute('data-active-image','1');
});

test('Home publishes catalog and posters below the department gateway, with four-photo demo products',async({page,request})=>{
 const payload=await catalog(request);const demos=payload.data.items.filter(item=>item.slug.startsWith('studio-demo-'));expect(demos.length).toBeGreaterThanOrEqual(8);for(const item of demos){expect(item.images).toHaveLength(4);expect(item.variants.every(variant=>variant.stock===0)).toBe(true);}
 await page.goto('/');const entry=page.locator('.department-gateway-entry');await expect(entry.getByRole('link',{name:'Men',exact:true})).toHaveAttribute('href','/men');await expect(entry.getByRole('link',{name:'Women',exact:true})).toHaveAttribute('href','/women');await expect(entry.locator('video[src]')).toHaveAttribute('src',/home-studio.mp4/);await expect(page.getByRole('heading',{name:'The studio catalog',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Find your next chapter',exact:true})).toBeAttached();const cards=page.locator('.editorial-product-card');await expect(cards.first()).toBeAttached();await cards.first().scrollIntoViewIfNeeded();expect((await new AxeBuilder({page}).include('.department-gateway .editorial-product-grid').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);await expect(cards.first().locator('.product-card-gallery')).toHaveAttribute('data-image-count','4');await expect(cards.first().locator('.editorial-color-swatches button')).toHaveCount(1);await expect(cards.first().locator('.editorial-color-swatches button')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-home-catalog-desktop.png')});await page.setViewportSize({width:390,height:844});await cards.first().scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-home-catalog-mobile.png')});await page.getByRole('button',{name:'Open Cruisin quick menu',exact:true}).click();await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');await page.keyboard.press('Escape');await expect(page.locator('html')).toHaveClass(/dark/);expect((await new AxeBuilder({page}).include('.department-gateway .editorial-product-grid').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);await page.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-home-catalog-mobile-dark.png')});const posters=page.locator('.cms-category-editorial a');await expect(posters).toHaveCount(4);for(const [index,href] of ['/men','/women','/category/men/shirts','/women#collection'].entries())await expect(posters.nth(index)).toHaveAttribute('href',href);await posters.first().scrollIntoViewIfNeeded();await expect.poll(()=>posters.first().locator('img').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThan(0);await page.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-home-posters-mobile.png')});
});
