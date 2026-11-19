import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const shop=process.env.PLAYWRIGHT_STOREFRONT_URL??'http://127.0.0.1:3192';
const api=process.env.PLAYWRIGHT_API_URL??'http://127.0.0.1:8192/api/v1';
test.setTimeout(90000);
const screenshotPath=(name:string):string=>resolve('../docs/qa/screenshots/'+name);
test('photographic collection stays responsive and applies real filter and sort queries',async({page,request})=>{
 await page.goto(shop+'/shop');await expect(page.locator('.collection-product-grid .editorial-product-card').first()).toBeVisible();await expect(page.locator('html')).toHaveClass(/light/);await expect(page.locator('.editorial-storefront')).toHaveCSS('background-color','rgb(255, 255, 255)');
 await mkdir(resolve('../docs/qa/screenshots'),{recursive:true});
 for(const width of [360,375,390,440,768,1024,1440]){await page.setViewportSize({width,height:960});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect.poll(()=>page.locator('.collection-product-grid').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width>=1024?4:2);if(width===390||width===1440){await expect.poll(()=>page.locator('.editorial-product-card').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');await page.screenshot({path:screenshotPath(`cruisin-v2-collection-${width}.png`)});}}
 await page.getByRole('button',{name:'Sort by',exact:true}).click();await page.getByRole('button',{name:'Price, low to high',exact:true}).click();await expect(page).toHaveURL(/sort=price-asc/);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Filters',exact:true}).click();const panel=page.getByRole('dialog',{name:'Filters',exact:true});await expect(panel).toBeVisible();await expect(panel.locator('details[open]')).toHaveCount(0);
 await panel.getByText('Price',{exact:true}).click();
 await panel.getByRole('textbox',{name:'Minimum price',exact:true}).fill('1000');await panel.getByRole('textbox',{name:'Maximum price',exact:true}).fill('100');await panel.locator('.collection-filter-apply').click();await expect(panel.getByRole('alert')).toContainText('Minimum price');
 await panel.getByRole('textbox',{name:'Minimum price',exact:true}).fill('');await panel.getByRole('textbox',{name:'Maximum price',exact:true}).fill('');
 await panel.getByText('Size',{exact:true}).click();
 const firstSize=panel.locator('.collection-filter-group').first().getByRole('checkbox').first();const size=(await firstSize.locator('..').innerText()).trim();await firstSize.check();
 const expected=(await (await request.get(api+'/products',{params:{size,sort:'price-asc',limit:1}})).json()).data.total;
 await expect(panel.locator('.collection-filter-apply')).toHaveText(`View ${expected} items`);await expect.poll(()=>panel.evaluate(el=>Math.round(el.getBoundingClientRect().left))).toBe(0);await page.screenshot({path:screenshotPath('cruisin-v2-collection-filters.png')});
 await panel.locator('.collection-filter-apply').click();await expect(panel).toHaveCount(0);await expect(page).toHaveURL(new RegExp('size='+encodeURIComponent(size)));await expect(page.getByRole('button',{name:`Remove Size: ${size}`,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Filters',exact:true}).click();await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(page.getByRole('button',{name:'Filters',exact:true})).toBeFocused();
});
test('product gallery, precise variant, quantity and cart work in the new product layout',async({page,request})=>{
 const catalog=(await (await request.get(api+'/products?limit=100')).json()).data.items;const candidate=catalog.find((product:{images:unknown[];variants:{stock:number;enabled?:boolean;images:unknown[]}[]})=>product.images.length>1&&product.variants.some(variant=>variant.enabled!==false&&variant.stock>0&&variant.images.length>1));expect(candidate).toBeTruthy();const title=candidate.title;await page.goto(shop+'/product/'+candidate.slug);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Shop now',exact:true})).toBeDisabled();
 await page.setViewportSize({width:1440,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.pdp-purchase-card')).toHaveCSS('position','absolute');
 const slides=await page.locator('.pdp-gallery-slide').count();expect(slides).toBeGreaterThan(1);await page.getByRole('button',{name:'Next image',exact:true}).click();await expect(page.locator('.pdp-gallery-controls')).toContainText('2 /');await page.getByRole('button',{name:'Previous image',exact:true}).click();await expect(page.locator('.pdp-gallery-controls')).toContainText('1 /');
 await expect.poll(()=>page.locator('.pdp-gallery-slide').first().evaluate(el=>Math.round(el.getBoundingClientRect().left))).toBe(0);
 await page.getByRole('group',{name:'Available sizes',exact:true}).locator('button:not([disabled])').first().click();await expect(page.getByRole('button',{name:'Add To Cart',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Shop now',exact:true})).toBeEnabled();
 await page.screenshot({path:screenshotPath('cruisin-v2-product-desktop.png')});
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.pdp-purchase-card')).toHaveCSS('position','static');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const related=page.locator('.pdp-related .editorial-product-card');if(await related.count()){await related.first().scrollIntoViewIfNeeded();await expect.poll(()=>related.first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');await related.last().scrollIntoViewIfNeeded();await expect.poll(()=>related.last().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');}await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:screenshotPath('cruisin-v2-product-mobile.png'),fullPage:true});
 let quantity=1;if(await page.getByRole('button',{name:'Increase quantity',exact:true}).isEnabled()){await page.getByRole('button',{name:'Increase quantity',exact:true}).click();quantity=2;}
 await expect(page.getByRole('group',{name:'Quantity',exact:true}).locator('output')).toHaveText(String(quantity));await page.getByRole('button',{name:'Add To Cart',exact:true}).click();await expect(page.getByRole('dialog').getByText(title,{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cruisin-cart')??'{}').state?.items?.[0]?.quantity)).toBe(quantity);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','native');await expect(page.locator('.pdp-gallery-dots')).toHaveCount(0);await page.getByRole('button',{name:'Next image',exact:true}).click();await expect(page.locator('.pdp-gallery-controls')).toContainText('2 /');
 const submissions:string[]=[];page.on('request',request=>{if(request.method()==='POST'&&/\/(orders|checkout)$/.test(new URL(request.url()).pathname))submissions.push(request.url());});await page.getByRole('button',{name:'Shop now',exact:true}).click();await expect(page).toHaveURL(/\/checkout(?:\?|$)|\/login/);expect(submissions).toEqual([]);
});
test('a product without photographs keeps its gallery height and usable purchase controls',async({page,request})=>{
 const list=await (await request.get(api+'/products?limit=1')).json();const slug=list.data.items[0].slug;const response=await request.get(api+'/products/'+slug);const payload=await response.json();payload.data.images=[];for(const variant of payload.data.variants)variant.images=[];
 await page.route('**/api/v1/products/'+slug,route=>route.fulfill({json:payload}));await page.setViewportSize({width:1280,height:900});await page.goto(shop+'/product/'+slug);
 const gallery=page.locator('.pdp-gallery');await expect(gallery.locator('img')).toHaveAttribute('src',/cruisin-image-fallback/);await expect.poll(()=>gallery.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(600);
 const size=page.getByRole('group',{name:'Available sizes',exact:true}).locator('button:not([disabled])').first();await size.click();await expect(page.getByRole('button',{name:'Add To Cart',exact:true})).toBeEnabled();
});
test('CMS collection campaign and banner media remain connected to the compact layout',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/v1/page-settings/landing/shop',route=>route.fulfill({json:{success:true,data:{pageType:'landing',pageSlug:'shop',title:'Studio collection',heroVideo:'/hero.mp4',mobileHeroVideo:'/hero.mp4',videoPosterImage:'/images/campaign/cruisin-editorial-hero-desktop-v1.png',isBannerVisible:true,bannerImage:'/images/campaign/cruisin-editorial-hero-desktop-v1.png',mobileBannerImage:'/images/campaign/cruisin-editorial-hero-mobile-v1.png',ctaText:'Studio collection banner',ctaLink:'/women',defaultGridView:4},message:'Synthetic CMS acceptance fixture'}}));
 await page.setViewportSize({width:390,height:844});await page.goto(shop+'/shop');const hero=page.getByTestId('listing-hero-media');await expect(hero).toBeVisible();await expect(hero.locator('video')).toHaveJSProperty('autoplay',false);await expect(hero.locator('video')).toHaveAttribute('controls','');await expect(page.locator('.collection-banner').getByRole('link',{name:'Studio collection banner',exact:true})).toHaveAttribute('href','/women');await expect(page.locator('.collection-banner-media img.sm\\:hidden')).toHaveAttribute('src',/hero-mobile/);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
