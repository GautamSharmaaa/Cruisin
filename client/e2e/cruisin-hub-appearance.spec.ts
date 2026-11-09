import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {DEFAULT_STOREFRONT_APPEARANCE as defaults} from '@cruisin/contracts/storefront-appearance';
import type {SiteSettingsDto} from '../types/dto.types';
const api=process.env.PLAYWRIGHT_API_URL??'http://127.0.0.1:8192/api/v1';
const admin=process.env.PLAYWRIGHT_ADMIN_URL??'http://127.0.0.1:3193';
const shots=resolve('../docs/qa/screenshots');
test.use({actionTimeout:15000});

test('admin saves validated ring colors independently and the storefront adapts the logo, disc and glow to each theme',async({page,request,context})=>{
 const original=(await (await request.get(api+'/site-settings')).json()).data as SiteSettingsDto;
 const previous={cruisinRingColorLight:original.cruisinRingColorLight??defaults.cruisinRingColorLight,cruisinRingColorDark:original.cruisinRingColorDark??defaults.cruisinRingColorDark};
 const login=await request.post(api+'/auth/login',{headers:{Origin:admin},data:{email:'admin@cruisin.local',password:'CruisinAdmin123'}});expect(login.ok()).toBe(true);
 const auth=(await login.json()).data as {accessToken:string};const headers={Origin:admin,Authorization:'Bearer '+auth.accessToken};
 try {
  expect((await request.put(api+'/admin/site-settings',{headers:{Origin:admin},data:{cruisinRingColorDark:'#123456'}})).status()).toBe(401);
  expect((await request.put(api+'/admin/site-settings',{headers,data:{cruisinRingColorLight:'url(javascript:alert(1))'}})).status()).toBe(400);
  await page.goto(admin+'/login');await page.getByLabel('Email',{exact:true}).fill('admin@cruisin.local');await page.getByLabel('Password',{exact:true}).fill('CruisinAdmin123');await page.getByRole('button',{name:'Enter Dashboard',exact:true}).click();await expect(page).toHaveURL(admin+'/');await page.goto(admin+'/storefront');
  await page.getByRole('button',{name:'Settings',exact:true}).click();const form=page.getByRole('form',{name:'Cruisin button appearance'});await expect(form).toBeVisible();
  await form.getByLabel('Light theme ring Hex color',{exact:true}).fill('#12345');await form.getByRole('button',{name:'Save ring colors',exact:true}).click();await expect(form.getByRole('alert').last()).toHaveText(/six-digit/);
  await form.getByLabel('Light theme ring Hex color',{exact:true}).fill('#D98040');await form.getByLabel('Dark theme ring Hex color',{exact:true}).fill('#F05A22');await form.getByRole('button',{name:'Save ring colors',exact:true}).click();await expect(form.getByRole('status')).toHaveText(/Ring colors saved/);
  const saved=(await (await request.get(api+'/site-settings')).json()).data as SiteSettingsDto;expect(saved.cruisinRingColorLight).toBe('#d98040');expect(saved.cruisinRingColorDark).toBe('#f05a22');expect(saved.standardShippingRate).toBe(original.standardShippingRate);expect(saved.isStorefrontNavigationVisible).toBe(original.isStorefrontNavigationVisible);
  await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Light theme ring Hex color',{exact:true})).toHaveValue('#d98040');
  const storefront=await context.newPage();await storefront.goto('http://127.0.0.1:3192/shop');await storefront.emulateMedia({reducedMotion:'reduce'});
  const button=storefront.locator('.cruisin-hub-trigger');await expect.poll(()=>button.evaluate(el=>getComputedStyle(el).getPropertyValue('--hub-ring').trim())).toBe('#d98040');
  expect(await button.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');expect(await button.locator('img').evaluate(el=>getComputedStyle(el).filter)).toBe('invert(1)');
  await button.click();await storefront.getByRole('button',{name:'Switch to dark mode'}).click();await expect.poll(()=>button.evaluate(el=>getComputedStyle(el).getPropertyValue('--hub-ring').trim())).toBe('#f05a22');expect(await button.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(8, 8, 8)');expect(await button.locator('img').evaluate(el=>getComputedStyle(el).filter)).toBe('none');await storefront.keyboard.press('Escape');await expect(storefront.getByRole('dialog',{name:'Cruisin quick menu'})).toBeHidden();
  await mkdir(shots,{recursive:true});await storefront.setViewportSize({width:390,height:844});await storefront.screenshot({path:resolve(shots,'cruisin-v2-hub-orange-dark-mobile.png')});
  await storefront.locator('.cruisin-hub-trigger').click();await storefront.getByRole('button',{name:'Switch to light mode'}).click();await storefront.keyboard.press('Escape');await expect(storefront.getByRole('dialog',{name:'Cruisin quick menu'})).toBeHidden();await storefront.screenshot({path:resolve(shots,'cruisin-v2-hub-orange-light-mobile.png')});
  await form.getByRole('button',{name:'Use footer orange',exact:true}).click();await form.getByRole('button',{name:'Save ring colors',exact:true}).click();await expect(form.getByRole('status')).toHaveText(/Ring colors saved/);
  expect((await new AxeBuilder({page}).include('form[aria-label="Cruisin button appearance"]').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await form.screenshot({path:resolve(shots,'cruisin-v2-hub-admin-colors.png')});await storefront.close();
 } finally { const restored=await request.put(api+'/admin/site-settings',{headers,data:previous});expect(restored.ok()).toBe(true); }
});

test('the circular reveal holds footer motion and scroll steady, then resumes cleanly in both directions',async({page})=>{
 await page.addInitScript(()=>{
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(keyframes,options){const animation=animate.call(this,keyframes,options);if(options&&typeof options==='object'&&options.pseudoElement==='::view-transition-new(root)'){animation.pause();animation.currentTime=480;(window as Window&{revealProbe?:Animation}).revealProbe=animation;}return animation;};
 });
 await page.goto('/shop');await expect(page.locator('.editorial-product-card').first()).toBeVisible();await page.locator('footer').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await expect(page.locator('.cruisin-footer-wave')).toBeInViewport();
 const wave=page.locator('.cruisin-footer-wave path').first(),orbit=page.locator('.cruisin-hub-orbit');let path=await wave.getAttribute('d');await expect.poll(()=>wave.getAttribute('d')).not.toBe(path);
 await page.getByRole('button',{name:'Open Cruisin quick menu'}).click();const menu=page.getByRole('dialog',{name:'Cruisin quick menu'});
 for(const label of ['Switch to dark mode','Switch to light mode']){
  await page.getByRole('button',{name:label}).click();await expect(page.locator('html')).toHaveAttribute('data-theme-reveal','active');await expect.poll(()=>page.evaluate(()=>(window as Window&{revealProbe?:Animation}).revealProbe?.playState)).toBe('paused');
  path=await wave.getAttribute('d');const top=await page.evaluate(()=>scrollY);expect(await orbit.evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');await page.waitForTimeout(180);expect(await wave.getAttribute('d')).toBe(path);expect(await page.evaluate(()=>scrollY)).toBe(top);
  await page.evaluate(()=>{(window as Window&{revealProbe?:Animation}).revealProbe?.play();});await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');expect(await page.evaluate(()=>scrollY)).toBe(top);await expect.poll(()=>wave.getAttribute('d')).not.toBe(path);expect(await orbit.evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('running');
 }
 await page.keyboard.press('Escape');await expect(menu).toBeHidden();await page.mouse.wheel(0,-400);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight));
});


test('an interrupted theme reveal releases animation and scrolling locks',async({page})=>{
 await page.addInitScript(()=>{
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(keyframes,options){const animation=animate.call(this,keyframes,options);if(options&&typeof options==='object'&&options.pseudoElement==='::view-transition-new(root)'){animation.pause();animation.currentTime=200;(window as Window&{interruptProbe?:Animation}).interruptProbe=animation;}return animation;};
 });
 await page.goto('/shop');await page.getByRole('button',{name:'Open Cruisin quick menu'}).click();await page.getByRole('button',{name:'Switch to dark mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme-reveal','active');
 await expect.poll(()=>page.evaluate(()=>(window as Window&{interruptProbe?:Animation}).interruptProbe?.playState)).toBe('paused');await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');await expect(page.locator('html')).toHaveClass(/dark/);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Switch to light mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme-reveal','active');await expect.poll(()=>page.evaluate(()=>(window as Window&{interruptProbe?:Animation}).interruptProbe?.playState)).toBe('paused');await page.setViewportSize({width:1280,height:900});await expect(page.locator('html')).not.toHaveAttribute('data-theme-reveal','active');await expect(page.locator('html')).not.toHaveClass(/dark/);expect(await page.locator('.cruisin-hub-orbit').evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('running');
});
