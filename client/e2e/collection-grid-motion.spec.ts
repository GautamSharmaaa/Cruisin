import { expect, type Locator, type Page, test } from '@playwright/test';

const media = '.collection-product-grid > .editorial-product-card > .editorial-product-media';
const switchButton = (page: Page): Locator => page.getByRole('button', { name: /^Switch to (window|regular) grid$/ });

async function pausePhotoAnimations(page: Page): Promise<void> {
  await page.evaluate(selector => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (this.matches(selector)) {
        animation.pause();
        animation.currentTime = 0;
      }
      return animation;
    };
  }, media);
}

async function samplePhoto(photo: Locator) {
  return photo.evaluate(element => {
    const animation = element.getAnimations()[0];
    if (!animation?.effect) throw new Error('Expected an animation on the product photo');
    const { delay, duration, endTime } = animation.effect.getComputedTiming();
    const box = () => {
      const { left, top, width } = element.getBoundingClientRect();
      return { left, top, width };
    };
    const start = box();
    animation.currentTime = (delay ?? 0) + Number(duration) * .25;
    const middle = box();
    animation.currentTime = endTime ?? 0;
    return { start, middle, end: box() };
  });
}

for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const phone = size.width < 768;
  test.describe(phone ? 'phone grid' : 'desktop grid', () => {
    test.use({ viewport: size, hasTouch: phone, isMobile: phone });

    test('photos ripple between layouts and reverse from their current positions', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto('/men?view=all');
      const grid = page.locator('#main .collection-product-grid');
      const photo = grid.locator('.editorial-product-media').nth(phone ? 2 : 4);
      await expect(photo).toBeVisible();
      await expect(grid).toHaveAttribute('data-density', 'regular');
      await pausePhotoAnimations(page);
      const original = await photo.boundingBox();
      if (!original) throw new Error('Expected a visible product photo');

      await switchButton(page).click();
      await expect(grid).toHaveAttribute('data-density', 'dense');
      const delays = await page.locator(media).evaluateAll(elements => elements.flatMap(element =>
        element.getAnimations().map(animation => animation.effect?.getTiming().delay ?? 0)));
      expect(Math.max(...delays) - Math.min(...delays)).toBeGreaterThan(5);
      const compact = await samplePhoto(photo);
      expect(compact.start.width).toBeCloseTo(original.width, 0);
      expect(compact.start.top).toBeCloseTo(original.y, 0);
      expect(compact.middle.width).toBeLessThan(compact.start.width);
      expect(compact.middle.width).toBeGreaterThan(compact.end.width);

      await page.locator(media).evaluateAll(elements => elements.forEach(element => element.getAnimations().forEach(animation => animation.finish())));
      await switchButton(page).click();
      await expect(grid).toHaveAttribute('data-density', 'regular');
      const partial = await photo.evaluate(element => {
        const animation = element.getAnimations()[0];
        const timing = animation.effect?.getComputedTiming();
        if (!timing) throw new Error('Expected the expanding photo to animate');
        animation.currentTime = (timing.delay ?? 0) + Number(timing.duration) * .3;
        return element.getBoundingClientRect().width;
      });
      expect(partial).toBeGreaterThan(compact.end.width);
      expect(partial).toBeLessThan(original.width);
      await switchButton(page).click();
      await expect(grid).toHaveAttribute('data-density', 'dense');
      expect((await samplePhoto(photo)).start.width).toBeCloseTo(partial, 0);
    });
  });
}

test('a grid switch keeps the visible product in view with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/men?view=all');
  const initialPhoto = page.locator(media).nth(8);
  await expect(initialPhoto).toBeAttached();
  await initialPhoto.evaluate(photo => window.scrollTo({ top: scrollY + photo.getBoundingClientRect().top - 164, behavior: 'instant' }));
  const anchor = await page.locator(media).evaluateAll(photos => {
    const top = document.querySelector('.collection-controls-surface')?.getBoundingClientRect().bottom ?? 0;
    return photos.findIndex(photo => photo.getBoundingClientRect().bottom > top);
  });
  expect(anchor).toBeGreaterThan(0);
  const toggle = switchButton(page);
  await expect(toggle).toBeInViewport();
  const bounds = await toggle.boundingBox();
  if (!bounds) throw new Error('Expected the grid toggle in the toolbar');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(page.locator('#main .collection-product-grid')).toHaveAttribute('data-density', 'dense');
  await expect(page.locator(media).nth(anchor)).toBeInViewport();
  expect(await page.locator(media).evaluateAll(photos => photos.flatMap(photo => photo.getAnimations()).length)).toBe(0);
});

test.describe('phone carousel in the grid', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a selected photo stays selected through both grid switches', async ({ page }) => {
    await page.goto('/men?view=all');
    const gallery = page.locator(`${media} .product-card-gallery[aria-roledescription]`).first();
    const track = gallery.locator('.product-card-gallery-viewport');
    await track.press('ArrowRight');
    const slide = () => track.evaluate(element => Math.round(element.scrollLeft / element.clientWidth));
    await expect.poll(slide).toBe(1);

    for (const density of ['dense', 'regular']) {
      await switchButton(page).tap();
      await expect(page.locator('#main .collection-product-grid')).toHaveAttribute('data-density', density);
      await page.locator(media).evaluateAll(photos => Promise.allSettled(photos.flatMap(photo => photo.getAnimations().map(animation => animation.finished))));
      await expect(gallery).toHaveAttribute('data-active-image', '2');
      await expect.poll(slide).toBe(1);
    }
  });
});
