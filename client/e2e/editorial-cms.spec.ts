import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const admin=process.env.PLAYWRIGHT_ADMIN_URL??'http://127.0.0.1:3193';
const shop=process.env.PLAYWRIGHT_STOREFRONT_URL??'http://127.0.0.1:3192';
const api=process.env.PLAYWRIGHT_API_URL??'http://127.0.0.1:8192/api/v1';
test.setTimeout(120000);
test('CMS presentation edits reach the actual preview, then the published storefront',async({page,request,browser})=>{
 const auth=await request.post(api+'/auth/login',{headers:{Origin:admin},data:{email:'admin@cruisin.local',password:'CruisinAdmin123'}});expect(auth.ok()).toBe(true);
 const headers={Origin:admin,Authorization:`Bearer ${(await auth.json()).data.accessToken}`};
 const home=(await (await request.get(api+'/cms/pages/home',{headers})).json()).data;
 const sections=(await (await request.get(api+`/cms/pages/${home._id}/sections`,{headers})).json()).data;
 const hero=sections.find((s:{type:string})=>s.type==='hero_campaign');const title='Studio edit '+Date.now();
 await page.goto(admin+'/login');await page.getByLabel('Email',{exact:true}).fill('admin@cruisin.local');await page.getByLabel('Password',{exact:true}).fill('CruisinAdmin123');await page.getByRole('button',{name:'Enter Dashboard',exact:true}).click();await expect(page).toHaveURL(admin+'/');
 await page.goto(admin+'/cms');await page.getByRole('button',{name:'Edit home page',exact:true}).click();
 try{
 const frame=page.frameLocator('iframe[title="Actual storefront preview"]');
 await expect(frame.getByRole('heading',{name:hero.title,exact:true})).toBeVisible();
 await page.getByLabel('Title',{exact:true}).fill(title);
 await page.getByRole('tab',{name:'Layout',exact:true}).click();
 await page.getByRole('combobox',{name:'Caption alignment',exact:true}).selectOption('left');
 await expect(frame.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await expect(frame.locator('.editorial-campaign')).toHaveAttribute('data-caption','left');
 const before=(await (await request.get(api+'/cms/home')).json()).data;expect(before.sections[0].title).toBe(hero.title);
 const saved=page.waitForResponse(r=>r.url().includes('/cms/sections/')&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Save draft',exact:true}).last().click();expect((await saved).ok()).toBe(true);
 await page.getByRole('button',{name:'Publish',exact:true}).click();const published=page.waitForResponse(r=>r.url().includes('/publish')&&r.request().method()==='POST');await page.getByRole('button',{name:'Publish changes',exact:true}).click();expect((await published).ok()).toBe(true);
 const context=await browser.newContext();const publicPage=await context.newPage();await publicPage.goto(shop);await expect(publicPage.getByRole('heading',{name:title,exact:true})).toBeVisible();await context.close();
 await page.getByRole('button',{name:'Edit women page',exact:true}).click();await expect(page.locator('.cms-studio-breadcrumb')).toContainText('Women');
 }finally{
 const restored=await request.patch(api+'/cms/sections/'+hero._id,{headers,data:{title:hero.title,subtitle:hero.subtitle,content:hero.content,styles:hero.styles,active:hero.active,status:hero.status}});expect(restored.ok()).toBe(true);expect((await request.post(api+`/cms/pages/${home._id}/publish`,{headers})).ok()).toBe(true);
 }
});
test('editorial layout responds to all requested widths and quick add requires an exact variant',async({page})=>{
 await page.goto(shop);await expect.poll(()=>page.locator('.editorial-campaign-caption').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');await mkdir(resolve('test-results/editorial-previews'),{recursive:true});
 for(const width of [360,375,390,430,768,1024,1366,1440]){
 await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect.poll(()=>page.locator('.editorial-product-grid').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width>=1024?4:2);
 if(width===390||width===1440)await page.screenshot({path:resolve(`test-results/editorial-previews/home-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:/^Quick add:/}).first().click();const dialog=page.locator('.editorial-quick-sheet');await expect(dialog).toBeVisible();
 const add=dialog.getByRole('button',{name:'Add to bag',exact:true});await expect(add).toBeDisabled();
 await dialog.locator('.editorial-variant-options button:not([disabled])').first().click();await expect(add).toBeEnabled();await add.click();await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('dialog').locator('h3').first()).toBeVisible();
});
test('smooth wheel scrolling and reduced-motion preference both work',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(shop);
 await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','smooth');
 await expect(page.locator('.storefront-route-transition')).toHaveAttribute('data-motion','full');
 const target=await page.evaluate(()=>Math.min(600,document.documentElement.scrollHeight-innerHeight));
 await page.mouse.wheel(0,600);
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(100);
 await expect.poll(()=>page.evaluate(expected=>Math.abs(window.scrollY-expected),target)).toBeLessThan(8);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','native');
 await expect(page.locator('.storefront-route-transition')).toHaveAttribute('data-motion','reduced');
 await expect.poll(()=>page.locator('html').evaluate(el=>getComputedStyle(el).scrollBehavior)).toBe('auto');
});
