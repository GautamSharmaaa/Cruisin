import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const api=process.env.PLAYWRIGHT_API_URL??'http://127.0.0.1:8192/api/v1';
test('gateway and department homepages have distinct published media and responsive navigation',async({page,request})=>{
 const media=new Set<string>();
 for(const slug of ['home','men','women']){const response=await request.get(api+'/cms/pages/'+slug+'/public');expect(response.ok()).toBe(true);const data=(await response.json()).data;const hero=data.sections.find((section:{type:string})=>section.type==='hero_campaign');media.add(hero.content.videoUrl);expect((await request.get('http://127.0.0.1:3192'+hero.content.videoUrl)).ok()).toBe(true);if(slug!=='home'){expect(data.sections.length).toBeGreaterThanOrEqual(3);for(const section of data.sections)for(const product of section.products??[])expect([slug,'unisex']).toContain(product.gender);}}
 expect(media.size).toBe(3);await mkdir(resolve('../docs/qa/screenshots'),{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');const choices=page.getByRole('navigation',{name:'Choose your Cruisin edit'});await expect(choices.getByRole('link')).toHaveText(['Men','Women']);await expect(page.getByRole('navigation',{name:'Shopping departments'})).toHaveCount(0);await expect(page.locator('main .editorial-product-card')).toHaveCount(0);
  await expect.poll(()=>page.locator('.editorial-navbar').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');await page.screenshot({path:resolve('../docs/qa/screenshots',`cruisin-v2-gateway-${width}.png`)});
  for(const department of ['Women','Men']){
   await page.goto('/');await page.getByRole('navigation',{name:'Choose your Cruisin edit'}).getByRole('link',{name:department,exact:true}).click();await expect(page).toHaveURL(new RegExp('/'+department.toLowerCase()+'$'));await expect(page.getByRole('navigation',{name:'Shopping departments'}).getByRole('link')).toHaveText(['Tops','Bottoms','Outerwear','Accessories']);await expect(page.locator('.editorial-campaign img').first()).toHaveAttribute('src',new RegExp(department==='Men'?'men-studio':'women-city'));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect.poll(()=>page.locator('.editorial-navbar').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');await page.screenshot({path:resolve('../docs/qa/screenshots',`cruisin-v2-${department.toLowerCase()}-homepage-${width}.png`)});
  }
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/women');await expect(page.locator('.editorial-campaign-video')).toHaveAttribute('src','/videos/department/women-city.mp4');await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.readyState)).toBeGreaterThanOrEqual(2);
});
