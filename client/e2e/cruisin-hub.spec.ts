import {expect,test,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {CmsExperienceDto,CmsSectionDto} from '../types/dto.types';
const shots=resolve('../docs/qa/screenshots');
const homeRoute='**/api/v1/cms/pages/home/public';
async function hub(page:Page):Promise<void>{await page.getByRole('button',{name:'Open Cruisin quick menu',exact:true}).click();await expect(page.getByRole('dialog',{name:'Cruisin quick menu'})).toBeVisible();}
async function stories(page:Page):Promise<void>{await hub(page);await page.getByRole('button',{name:'Stories',exact:true}).click();await expect(page.getByRole('dialog',{name:'Cruisin stories',exact:true})).toBeVisible();}
const section=(id:string,extra:Partial<CmsSectionDto>={}):CmsSectionDto=>({id,type:'hero_campaign',title:'Story '+id,subtitle:'The Cruisin edit',status:'published',active:true,sortOrder:Number(id)||0,content:{desktopMedia:'/images/campaign/cruisin-editorial-hero-desktop-v1.png',mobileMedia:'/images/campaign/cruisin-editorial-hero-mobile-v1.png',ctaLink:'/shop?q=cardigan',ctaText:'Explore this story'},...extra});
const fixture:CmsExperienceDto={page:{slug:'home',title:'Home',status:'published'},preview:false,sections:[section('1'),section('2'),section('3'),section('draft',{status:'draft'}),section('inactive',{active:false}),section('scheduled',{startDate:'2099-01-01'}),section('expired',{endDate:'2000-01-01'}),section('hidden',{hideOnDesktop:true,hideOnMobile:true}),section('script',{content:{desktopMedia:'javascript:alert(1)'}})]};

test('quick menu has exactly three actions, keyboard/outside dismissal, real Instagram, and circular persistent themes',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('cruisin-storefront-theme','light');
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(keyframes,options){const animation=animate.call(this,keyframes,options);if(options&&typeof options==='object'&&options.pseudoElement==='::view-transition-new(root)'){document.documentElement.dataset.revealFrames=JSON.stringify(keyframes);document.documentElement.dataset.revealPalette=getComputedStyle(document.querySelector('.editorial-navbar')!).backgroundColor;const probe=window as Window&{themeRevealProbe?:Animation};if(!probe.themeRevealProbe){animation.pause();animation.currentTime=130;probe.themeRevealProbe=animation;}}return animation;};
 });
 await page.goto('/shop');await hub(page);const menu=page.getByRole('dialog',{name:'Cruisin quick menu'});
 await expect(menu.locator('button,a')).toHaveCount(3);await expect(menu.getByRole('link',{name:/Cruisin on Instagram/})).toHaveAttribute('href','https://www.instagram.com/cruisin.in/');await expect(menu.getByRole('link')).toHaveAttribute('target','_blank');
 await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(page.getByRole('button',{name:'Open Cruisin quick menu'})).toBeFocused();
 await hub(page);await page.mouse.click(300,200);await expect(menu).toBeHidden();await hub(page);
 const action=menu.getByRole('button',{name:'Switch to dark mode'});await action.hover();await expect.poll(()=>menu.evaluate(el=>el.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length)).toBe(0);const rect=await action.boundingBox();if(!rect)throw new Error('Missing theme origin');
 await action.click();await expect(page.locator('html')).toHaveClass(/dark/);await expect(page.locator('html')).toHaveAttribute('data-theme-reveal','active');
 await expect.poll(()=>page.locator('html').getAttribute('data-reveal-frames')).toBeTruthy();expect(await page.locator('html').getAttribute('data-reveal-palette')).toBe('rgb(8, 8, 8)');const frames=JSON.parse((await page.locator('html').getAttribute('data-reveal-frames'))!) as {clipPath:string[]};
 const expectedX=rect.x+rect.width/2,expectedY=rect.y+rect.height/2;const values=frames.clipPath[0].match(/[\d.]+/g)?.map(Number);expect(values?.[0]).toBe(0);expect(values?.[1]).toBeCloseTo(expectedX,0);expect(values?.[2]).toBeCloseTo(expectedY,0);
 await mkdir(shots,{recursive:true});await page.screenshot({path:resolve(shots,'cruisin-v2-theme-circle.png')});await page.evaluate(()=>{(window as Window&{themeRevealProbe?:Animation}).themeRevealProbe?.play();});
 await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');await expect(menu.getByRole('button',{name:'Switch to light mode'})).toBeVisible();
 expect((await new AxeBuilder({page}).include('.cruisin-hub-menu').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 await mkdir(shots,{recursive:true});await page.screenshot({path:resolve(shots,'cruisin-v2-hub-desktop-dark.png')});
 // Do not reset the saved preference when checking persistence on a full reload.
 expect(await page.evaluate(()=>localStorage.getItem('cruisin-storefront-theme'))).toBe('dark');
 await menu.getByRole('button',{name:'Switch to light mode'}).click();await expect(page.locator('html')).not.toHaveClass(/dark/);await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');
});

test('real published CMS campaign opens as a story and focus returns to the Cruisin button',async({page})=>{
 await page.goto('/shop');await stories(page);const dialog=page.getByRole('dialog',{name:'Cruisin stories',exact:true});
 await expect(dialog.locator('.cruisin-story-card')).toBeVisible();await dialog.getByRole('button',{name:'Pause stories'}).click();await expect(dialog.getByRole('button',{name:'Play stories'})).toHaveAttribute('aria-pressed','true');
 await expect(dialog.locator('img')).toBeVisible();await expect.poll(()=>dialog.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect.poll(()=>dialog.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 expect((await new AxeBuilder({page}).include('.cruisin-stories').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 await mkdir(shots,{recursive:true});await page.screenshot({path:resolve(shots,'cruisin-v2-stories-desktop.png')});
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(page.getByRole('button',{name:'Open Cruisin quick menu'})).toBeFocused();expect(await page.evaluate(()=>getComputedStyle(document.body).pointerEvents)).not.toBe('none');
 await page.setViewportSize({width:390,height:844});await hub(page);await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveClass(/dark/);await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');await page.getByRole('button',{name:'Stories',exact:true}).click();await dialog.getByRole('button',{name:'Pause stories'}).click();await expect.poll(()=>dialog.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');expect((await new AxeBuilder({page}).include('.cruisin-stories').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);await page.screenshot({path:resolve(shots,'cruisin-v2-stories-mobile-dark.png')});await page.keyboard.press('Escape');
});

test('published story order, pause/resume, keyboard, focus trap, and CTA work while private and hidden content stay out',async({page})=>{
 await page.route(homeRoute,route=>route.fulfill({json:{success:true,data:fixture}}));await page.goto('/shop');await stories(page);
 const dialog=page.getByRole('dialog',{name:'Cruisin stories',exact:true});await expect(dialog.getByRole('status')).toHaveText('Story 1 of 3');await expect(dialog.locator('.cruisin-story-card')).toHaveAttribute('data-story-id','1');
 await dialog.getByRole('button',{name:'Pause stories'}).click();await page.waitForTimeout(7200);await expect(dialog.getByRole('status')).toHaveText('Story 1 of 3');
 await dialog.getByRole('button',{name:'Play stories'}).click();await expect(dialog.getByRole('status')).toHaveText('Story 2 of 3',{timeout:8500});
 await dialog.getByRole('button',{name:'Pause stories'}).click();await page.keyboard.press('ArrowRight');await expect(dialog.getByRole('status')).toHaveText('Story 3 of 3');await expect(dialog.getByRole('button',{name:'Next story'})).toBeDisabled();await page.keyboard.press('ArrowLeft');await expect(dialog.getByRole('status')).toHaveText('Story 2 of 3');
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
 await dialog.getByRole('link',{name:'Explore this story'}).click();await expect(page).toHaveURL(/shop\?q=cardigan/);await expect(dialog).toBeHidden();
});

test('empty and failed story feeds have honest retry states',async({page})=>{
 let fail=true;await page.route(homeRoute,route=>fail?route.fulfill({status:503,json:{success:false,message:'Unavailable'}}):route.fulfill({json:{success:true,data:{...fixture,sections:[]}}}));
 await page.goto('/shop');await stories(page);const dialog=page.getByRole('dialog',{name:'Cruisin stories',exact:true});await expect(dialog.getByText('Stories couldn’t load. Try again.')).toBeVisible();fail=false;await dialog.getByRole('button',{name:'Try again'}).click();await expect(dialog.getByText('More stories are on the way.')).toBeVisible();await page.keyboard.press('Escape');
});

test('reduced motion and browsers without View Transitions still change theme, and preference survives reload',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/shop');await hub(page);await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveClass(/dark/);expect(await page.locator('html').getAttribute('data-theme-reveal')).toBeNull();
 await page.reload();await expect(page.locator('html')).toHaveClass(/dark/);await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{Object.defineProperty(document,'startViewTransition',{value:undefined,configurable:true});});await hub(page);await page.getByRole('button',{name:'Switch to light mode'}).click();await expect(page.locator('html')).not.toHaveClass(/dark/);expect(await page.locator('html').getAttribute('data-theme-reveal')).toBeNull();
});

test.describe('touch hub and stories',()=>{
 test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 test('phone/tablet fit, native touch swipe, reduced-motion stories, and unobstructed checkout',async({page})=>{
  await page.route(homeRoute,route=>route.fulfill({json:{success:true,data:fixture}}));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/shop');await hub(page);await mkdir(shots,{recursive:true});await page.screenshot({path:resolve(shots,'cruisin-v2-hub-mobile-light.png')});await page.getByRole('button',{name:'Stories',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Cruisin stories',exact:true});await expect(dialog.getByRole('status')).toHaveText('Story 1 of 3');await page.waitForTimeout(7200);await expect(dialog.getByRole('status')).toHaveText('Story 1 of 3');
  const box=await dialog.locator('.cruisin-story-media').boundingBox();if(!box)throw new Error('Missing story media');const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y:box.y+box.height*.5}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.8-i*.075),y:box.y+box.height*.5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await expect(dialog.getByRole('status')).toHaveText('Story 2 of 3');
  await page.screenshot({path:resolve(shots,'cruisin-v2-stories-swipe-fixture-mobile.png')});
  for(const width of [375,768,1024]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const bounds=await dialog.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(901);}
  await dialog.getByRole('button',{name:'Close stories'}).click();await expect(page.getByRole('button',{name:'Open Cruisin quick menu'})).toBeFocused();await page.goto('/checkout');await expect(page.locator('.cruisin-hub-trigger')).toHaveCount(0);
 });
});

test('the real Cruisin logo has a revolving glow ring in both themes and a still reduced-motion state',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/shop');const trigger=page.getByRole('button',{name:'Open Cruisin quick menu',exact:true}),logo=trigger.locator('img'),orbit=trigger.locator('.cruisin-hub-orbit');
 await expect(logo).toHaveAttribute('src','/cruisin-logo.svg');await expect.poll(()=>logo.evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
 for(const theme of ['light','dark']){
  if(theme==='dark'){await hub(page);await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');await page.keyboard.press('Escape');}
  const first=await orbit.evaluate(el=>getComputedStyle(el).transform);await expect.poll(()=>orbit.evaluate(el=>getComputedStyle(el).transform)).not.toBe(first);
  await mkdir(shots,{recursive:true});await page.screenshot({path:resolve(shots,'cruisin-v2-hub-logo-ring-'+theme+'.png')});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>orbit.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(shots,'cruisin-v2-hub-logo-ring-mobile.png')});
});
