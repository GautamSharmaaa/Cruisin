import {expect,test,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';

test.use({hasTouch:true});
async function swipeHandle(page:Page,distance:number):Promise<void>{
 const bounds=await page.locator('[data-auth-drag-handle]').boundingBox();
 if(!bounds)throw new Error('Missing sheet handle');
 const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 const session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let step=1;step<=10;step++){
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+distance*step/10}]});
  await page.waitForTimeout(20);
 }
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await session.detach();
}
async function expectBottom(page:Page):Promise<void>{
 await expect.poll(async()=>{const bounds=await page.locator('.auth-sheet').boundingBox();return bounds?Math.abs(bounds.y+bounds.height-(page.viewportSize()?.height??0)):100;}).toBeLessThan(2);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
for(const width of [390,820,1024,1194,1366])for(const theme of ['light','dark'] as const){
 test(`bottom sheet supports all forms and touch gestures: ${width}px ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:width===1194?834:1000});
  await page.addInitScript(value=>localStorage.setItem('cruisin-storefront-theme',value),theme);
  await page.route('**/api/v1/auth/otp/request',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{requestId:'665f6d8403bd2edc93800000',channel:'whatsapp',cooldownSeconds:60,expiresAt:new Date(Date.now()+300000).toISOString()},message:'OTP sent'})}));
  await page.goto('/shop');
  await expect(page.locator('html')).toHaveClass(new RegExp(theme));
  await page.getByRole('button',{name:'Account',exact:true}).click();
  const overlay=page.getByTestId('mobile-auth-overlay');
  await expect(overlay).toBeVisible();await expectBottom(page);
  await expect(page).toHaveURL(/\/shop$/);
  const capture=async(name:string):Promise<void>=>{if(width===390||width===1024){await mkdir(resolve('../docs/qa/screenshots'),{recursive:true});await page.locator('.auth-sheet').screenshot({path:resolve(`../docs/qa/screenshots/cruisin-v2-swipe-${name}-${theme}-${width}.png`)});}};
  await capture('login');
  await swipeHandle(page,-120);await expect(page.locator('.auth-sheet')).toHaveAttribute('data-expanded','true');await expectBottom(page);
  await page.getByRole('button',{name:'Collapse form',exact:true}).click();await expect(page.locator('.auth-sheet')).toHaveCSS('min-height','0px');
  await page.getByLabel('WhatsApp number').fill('9876543210');await page.getByRole('button',{name:'Get OTP',exact:true}).click();
  await expect(page.getByLabel('Verification code')).toBeFocused();await expectBottom(page);await expect(page.getByRole('dialog')).toHaveCount(1);await capture('otp');
  await page.getByRole('button',{name:'Change number',exact:true}).click();await page.getByRole('button',{name:'Use email or Google',exact:true}).click();
  await expect(page.getByLabel('Password',{exact:true})).toBeVisible();await expectBottom(page);
  await page.getByRole('tab',{name:'Create account',exact:true}).click();await expect(page.getByLabel('Confirm Password')).toBeVisible();await expectBottom(page);await capture('signup');
  expect((await new AxeBuilder({page}).include('.auth-overlay').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await swipeHandle(page,140);await expect(overlay).toBeHidden();await expect(page).toHaveURL(/\/shop$/);await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe('');
  await expect(page.getByRole('button',{name:'Account',exact:true})).toBeFocused();
 });
}

test('direct tablet login and registration URLs use sheets, while desktop keeps its page',async({page,browser})=>{
 await page.setViewportSize({width:1024,height:900});await page.goto('/register');
 await expect(page.getByTestId('mobile-auth-overlay')).toBeVisible();await expect(page.getByLabel('Confirm Password')).toBeVisible();await expectBottom(page);
 await page.getByTestId('auth-shell').getByRole('button',{name:'Close',exact:true}).click();await expect(page).toHaveURL(/\/shop$/);
 await page.goto('/login?method=alternative');await expect(page.getByTestId('mobile-auth-overlay')).toBeVisible();await expectBottom(page);
 const desktop=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:false});await desktop.goto('http://127.0.0.1:3192/login?method=alternative');await expect(desktop.getByTestId('mobile-auth-overlay')).toBeHidden();await expect(desktop.locator('.auth-page')).toBeVisible();await expect.poll(()=>desktop.evaluate(()=>document.body.style.overflow)).toBe('');await desktop.close();
});

test('tablet checkout opens the authentication sheet without leaving checkout',async({page})=>{
 await page.setViewportSize({width:1024,height:900});await page.goto('/checkout');
 await page.locator('#main').getByRole('button',{name:'Continue with WhatsApp',exact:true}).click();
 await expect(page.getByTestId('mobile-auth-overlay')).toBeVisible();await expectBottom(page);await expect(page).toHaveURL(/\/checkout$/);
 await page.getByTestId('mobile-auth-backdrop').click({position:{x:10,y:10}});await expect(page.getByTestId('mobile-auth-overlay')).toBeHidden();await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe('');
});
