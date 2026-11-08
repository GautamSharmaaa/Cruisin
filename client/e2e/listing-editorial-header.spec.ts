import {expect,test} from '@playwright/test';
const routes=['/shop','/new-featured','/men','/women','/sale','/collections','/collections/black-transit','/category/men'];
test.describe('photographic collection layout',()=>{
 test('retains a named collection and real controls on every listing route',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  for(const path of routes){await page.goto(path);await expect(page.locator('.collection-page > h1')).not.toBeEmpty();await expect(page.getByTestId('listing-toolbar')).toBeVisible();await expect(page.getByRole('button',{name:'Filters',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Sort by',exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);}
 });
 test('shows compact collection controls above the products on mobile',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/category/men');await expect(page.locator('.collection-page > h1')).toContainText('Men');const toolbar=page.getByTestId('listing-toolbar');await expect(toolbar).toBeVisible();await expect.poll(()=>toolbar.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(220);await page.getByRole('button',{name:'Filters',exact:true}).click();await expect(page.getByRole('dialog',{name:'Filters',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Filters',exact:true})).toHaveCount(0);});
});
