import {expect,test} from '@playwright/test';
test.describe('compact Cruisin storefront identity',()=>{
 test('keeps the centered wordmark and working header controls at desktop and mobile widths',async({page})=>{
  for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto('/shop');const logo=page.locator('header .cruisin-wordmark');await expect(logo).toBeVisible();await expect(logo).toHaveText(/Cruisin/);await expect(logo).toHaveAttribute('href','/');await expect.poll(()=>logo.evaluate(el=>Math.abs((el.getBoundingClientRect().left+el.getBoundingClientRect().right)/2-document.documentElement.clientWidth/2))).toBeLessThan(2);await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Search',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Cart',exact:true})).toBeVisible();}
 });
 test('respects reduced motion in the storefront header and route entrance',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/shop');await expect(page.locator('header .cruisin-wordmark')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','native');await expect(page.locator('.storefront-route-transition')).toHaveAttribute('data-motion','reduced');});
});
