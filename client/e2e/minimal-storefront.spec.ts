import {test,expect} from '@playwright/test';
test('minimal departments, menu, catalog and footer on desktop and phone',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto('/');const departments=page.getByRole('navigation',{name:'Choose your Cruisin edit'});await expect(departments.getByRole('link')).toHaveText(['Men','Women']);
  await departments.getByRole('link',{name:'Men',exact:true}).click();await expect(page).toHaveURL(/\/men\?view=all$/);await expect(page.getByRole('navigation',{name:'Product categories'})).toBeVisible();
  await expect(page.locator('[data-testid="listing-hero-media"],.collection-banner,.collection-carousel')).toHaveCount(0);
  await expect(page.locator('footer select,footer button')).toHaveCount(0);
  await page.getByRole('button',{name:'Menu',exact:true}).click();const roots=page.locator('.minimal-menu-primary nav .minimal-menu-root');await expect(roots).toHaveText(['Men','Women','Collections','Sale']);await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

test('product gallery supports desktop drag and native phone swipes',async({page})=>{
 await page.goto('/product/oversized-knit-cardigan');const track=page.locator('.pdp-gallery-track');await expect(track.locator('.pdp-gallery-slide')).toHaveCount(2);await track.scrollIntoViewIfNeeded();let box=await track.boundingBox();if(!box)throw new Error('Gallery missing');
 await page.mouse.move(box.x+box.width*.7,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.4,{steps:14});await page.mouse.up();await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
 await page.setViewportSize({width:390,height:844});await page.reload();await track.scrollIntoViewIfNeeded();box=await track.boundingBox();if(!box)throw new Error('Gallery missing');const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});const y=box.y+Math.min(box.height*.4,300);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y}]});for(let step=1;step<=10;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330-step*25,y}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);await cdp.detach();
});
