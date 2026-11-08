import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const admin=process.env.PLAYWRIGHT_ADMIN_URL??'http://127.0.0.1:3193';
const api=process.env.PLAYWRIGHT_API_URL??'http://127.0.0.1:8192/api/v1';
test.setTimeout(120000);
test('reference editor connects canvas selection, media, buttons, layout, visibility and responsive controls',async({page,request})=>{
 const auth=await request.post(api+'/auth/login',{headers:{Origin:admin},data:{email:'admin@cruisin.local',password:'CruisinAdmin123'}});expect(auth.ok()).toBe(true);
 const headers={Origin:admin,Authorization:`Bearer ${(await auth.json()).data.accessToken}`};
 const home=(await (await request.get(api+'/cms/pages/home',{headers})).json()).data;
 const sections=(await (await request.get(api+`/cms/pages/${home._id}/sections`,{headers})).json()).data;
 const hero=sections.find((s:{type:string})=>s.type==='hero_campaign');
 await page.goto(admin+'/login');await page.getByLabel('Email',{exact:true}).fill('admin@cruisin.local');await page.getByLabel('Password',{exact:true}).fill('CruisinAdmin123');await page.getByRole('button',{name:'Enter Dashboard',exact:true}).click();await expect(page).toHaveURL(admin+'/');await page.goto(admin+'/cms');await page.getByRole('combobox',{name:'Color theme',exact:true}).selectOption('light');
 const ready=async():Promise<void>=>{await expect(page.getByRole('button',{name:'Publish',exact:true})).toBeEnabled();};
 try{
 await expect(page.getByRole('heading',{name:'Storefront editor',exact:true})).toBeVisible();
 const nav=page.getByRole('navigation',{name:'Page sections',exact:true});await expect(nav).toBeVisible();
 const frame=page.frameLocator('iframe[title="Actual storefront preview"]');await expect(frame.getByRole('heading',{name:hero.title,exact:true})).toBeVisible();
 await expect(frame.locator(`[data-cms-section-id="${hero._id}"]`)).toHaveAttribute('data-selected','true');
 // Canvas selection selects the same real section in the inspector.
 const other=sections.find((s:{_id:string;active:boolean})=>s._id!==hero._id&&s.active);
 if(other){await frame.locator(`[data-select-cms-section="${other._id}"]`).click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue(other.title);await nav.getByRole('button',{name:`Edit section: ${hero.title}`,exact:true}).click();}
 await expect.poll(()=>page.locator('.cms-media-control img').first().evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 const previewStarted=await frame.locator('body').evaluate(()=>performance.timeOrigin);
 await page.getByRole('button',{name:'Add button',exact:true}).click();
 await page.getByLabel('Button label 2',{exact:true}).fill('Explore Women');
 await page.getByLabel('Button destination 2',{exact:true}).fill('/women');
 await expect(frame.getByRole('link',{name:'Explore Women',exact:true})).toHaveAttribute('href','/women');await ready();expect(await frame.locator('body').evaluate(()=>performance.timeOrigin)).toBe(previewStarted);
 await page.getByRole('tab',{name:'Layout',exact:true}).click();
 await page.getByRole('slider',{name:'Image overlay',exact:true}).fill('60');
 await expect(frame.locator('.editorial-campaign').first()).toHaveAttribute('data-overlay-strength','60');await ready();
 await page.getByRole('tab',{name:'Layout',exact:true}).press('ArrowRight');await expect(page.getByRole('tab',{name:'Visibility',exact:true})).toBeFocused();
 await page.getByRole('switch',{name:'Show section',exact:true}).click();await expect(page.getByRole('switch',{name:'Show section',exact:true})).toHaveAttribute('aria-checked','false');await ready();
 await page.getByRole('switch',{name:'Show section',exact:true}).click();await ready();
 await page.getByRole('tab',{name:'Content',exact:true}).click();
 const uploaded=page.waitForResponse(r=>r.url().endsWith('/admin/operations/media')&&r.request().method()==='POST');
 await page.getByLabel('Replace Mobile image',{exact:true}).setInputFiles({name:'cms-studio-test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGJkAAAAASUVORK5CYII=','base64')});
 expect((await uploaded).ok()).toBe(true);await page.locator('.cms-media-control').filter({has:page.getByRole('img',{name:'Mobile image',exact:true})}).getByText('Image URL',{exact:true}).click();await expect(page.getByLabel('Mobile image Image URL',{exact:true})).toHaveValue(/\/media\/[^/]+\/content$/);await ready();
 // Restore the visible campaign image before capturing the editor.
 await page.getByLabel('Mobile image Image URL',{exact:true}).fill(hero.content.mobileMedia);await ready();
 await page.getByRole('button',{name:'Mobile',exact:true}).click();await expect(page.locator('iframe[title="Actual storefront preview"]')).toHaveCSS('width','390px');
 await page.getByRole('combobox',{name:'Canvas zoom',exact:true}).selectOption('75');await expect(page.locator('.cms-studio-scaled-canvas')).toHaveCSS('width','292.5px');
 await page.getByRole('button',{name:'Desktop',exact:true}).click();await page.getByRole('combobox',{name:'Canvas zoom',exact:true}).selectOption('fit');
 await page.getByRole('button',{name:'Add section',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Add section',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Version history',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('button',{name:'Restore',exact:true}).first()).toBeVisible();await page.keyboard.press('Escape');
 const createdResponse=page.waitForResponse(r=>r.url().endsWith(`/cms/pages/${home._id}/sections`)&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Duplicate section',exact:true}).click();const duplicate=(await (await createdResponse).json()).data;
 await expect(page.getByLabel('Title',{exact:true})).toHaveValue(hero.title+' Copy');
 const reordered=page.waitForResponse(r=>r.url().endsWith('/reorder')&&r.request().method()==='POST');await nav.getByRole('button',{name:`Move section up: ${hero.title} Copy`,exact:true}).click();expect((await reordered).ok()).toBe(true);
 await page.getByRole('button',{name:'Remove section',exact:true}).click();const removed=page.waitForResponse(r=>r.url().endsWith('/cms/sections/'+duplicate._id)&&r.request().method()==='DELETE');await page.getByRole('button',{name:`Confirm delete section: ${hero.title} Copy`,exact:true}).click();expect((await removed).ok()).toBe(true);await expect(nav.getByRole('button',{name:`Edit section: ${hero.title} Copy`,exact:true})).toHaveCount(0);
 await nav.getByRole('button',{name:`Edit section: ${hero.title}`,exact:true}).click();
 await page.getByRole('button',{name:'Edit men page',exact:true}).click();await expect(page.locator('.cms-studio-breadcrumb')).toContainText('Men');await ready();
 await page.getByRole('button',{name:'Edit women page',exact:true}).click();await expect(page.locator('.cms-studio-breadcrumb')).toContainText('Women');await ready();
 await page.getByRole('button',{name:'Edit home page',exact:true}).click();await expect(frame.getByRole('heading',{name:hero.title,exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Layout',exact:true}).click();await page.getByRole('slider',{name:'Image overlay',exact:true}).fill('30');await ready();await page.getByRole('tab',{name:'Content',exact:true}).click();
 await expect.poll(()=>frame.locator('.editorial-campaign-caption').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 await expect(page.getByText('Section removed from draft.',{exact:true})).toHaveCount(0);
 await mkdir(resolve('../docs/qa/screenshots'),{recursive:true});await page.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-cms-studio-desktop.png')});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.cms-studio-mobile-tabs').getByRole('button',{name:'Sections',exact:true}).click();await expect(nav).toBeVisible();
 await page.locator('.cms-studio-mobile-tabs').getByRole('button',{name:'Section inspector',exact:true}).click();await expect(page.getByRole('tab',{name:'Content',exact:true})).toBeVisible();
 await page.screenshot({path:resolve('../docs/qa/screenshots/cruisin-v2-cms-studio-mobile.png')});
 }finally{
 const restored=await request.patch(api+'/cms/sections/'+hero._id,{headers,data:{title:hero.title,subtitle:hero.subtitle,content:hero.content,styles:hero.styles,active:hero.active,status:hero.status}});expect(restored.ok()).toBe(true);
 }
});
