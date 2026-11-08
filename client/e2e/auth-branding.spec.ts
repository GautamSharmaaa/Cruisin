import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
const screenshots=resolve('../docs/qa/screenshots');
for(const theme of ['light','dark'] as const)for(const width of [390,1440]){
 test(`minimal authentication and CMS menu: ${theme}, ${width}px`,async({page})=>{
  await mkdir(screenshots,{recursive:true});
  await page.setViewportSize({width,height:width<1024?844:1000});
  await page.route('**/api/v1/auth/otp/request',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{requestId:'665f6d8403bd2edc93800000',channel:'whatsapp',cooldownSeconds:60,expiresAt:new Date(Date.now()+300000).toISOString()},message:'OTP sent'})}));
  await page.goto('/login');
  await page.getByRole('combobox',{name:'Color theme',exact:true}).selectOption(theme);
  const auth=page.getByTestId('auth-shell');
  await auth.scrollIntoViewIfNeeded();
  await expect(auth.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
  await auth.screenshot({path:resolve(screenshots,`cruisin-v2-minimal-login-${theme}-${width}.png`)});
  expect((await new AxeBuilder({page}).include('.minimal-auth').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.getByLabel('WhatsApp number').fill('9876543210');
  await page.getByRole('button',{name:'Get OTP',exact:true}).click();
  await expect(page.getByLabel('Verification code')).toBeFocused();
  await expect(page.getByRole('button',{name:'Resend in 00:60'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Resend in/})).toBeDisabled();
  await auth.screenshot({path:resolve(screenshots,`cruisin-v2-minimal-otp-${theme}-${width}.png`)});
  expect((await new AxeBuilder({page}).include('.minimal-auth').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button',{name:'Change number',exact:true}).click();
  await page.getByRole('button',{name:'Use email or Google',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Email',exact:true})).toBeVisible();
  await auth.screenshot({path:resolve(screenshots,`cruisin-v2-minimal-email-${theme}-${width}.png`)});
  expect((await new AxeBuilder({page}).include('.minimal-auth').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByLabel('Email', {exact:true})).toHaveAttribute('aria-invalid','true');
  await page.getByRole('tab',{name:'Create account',exact:true}).click();
  await expect(page.getByLabel('Confirm Password')).toBeVisible();
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  const menu=page.locator('.minimal-menu');
  await menu.getByRole('button',{name:'Men',exact:true}).click();
  await expect(menu.getByRole('button',{name:'Men',exact:true})).toHaveAttribute('aria-expanded','true');
  if(width<1024){await menu.getByRole('button',{name:'Clothing',exact:true}).click();await expect(menu.getByRole('link',{name:'T-Shirts',exact:true}).first()).toBeVisible();await menu.getByRole('button',{name:'Clothing',exact:true}).click();await expect(menu.getByRole('link',{name:'T-Shirts',exact:true})).toHaveCount(0);await menu.getByRole('button',{name:'Clothing',exact:true}).click();}
  await expect(menu.getByRole('link',{name:'T-Shirts',exact:true}).first()).toBeVisible();
  if(width>=1024)await expect(menu.getByRole('button',{name:'Continue with WhatsApp',exact:true})).toBeInViewport();
  await menu.screenshot({path:resolve(screenshots,`cruisin-v2-minimal-menu-${theme}-${width}.png`)});
  expect((await new AxeBuilder({page}).include('.minimal-menu').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const controls=menu.locator('a[href],button:not([disabled]),input:not([disabled])');
  await controls.last().focus();await page.keyboard.press('Tab');await expect(menu.getByRole('button',{name:'Close',exact:true})).toBeFocused();
  if(width<1024){await menu.getByRole('button',{name:'Back',exact:true}).click();await expect(menu.getByRole('button',{name:'Women',exact:true})).toBeVisible();await menu.getByRole('button',{name:'Men',exact:true}).click();}
  const target=menu.getByRole('link',{name:'T-Shirts',exact:true}).first();const href=await target.getAttribute('href');
  await target.click();await expect(menu).toBeHidden();await expect(page).toHaveURL(new URL(href??'/',page.url()).toString());
  await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe('');
 });
}
