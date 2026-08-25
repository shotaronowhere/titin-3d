import { expect } from '@playwright/test';

export const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1280, height: 720 }),
  responsive: Object.freeze({ width: 375, height: 812 }),
});

export const SC27A_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 375, height: 812 }),
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 768, height: 1024 }),
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 1280, height: 720 }),
  Object.freeze({ width: 1440, height: 900 }),
]);

export async function setReviewViewport(page, name) {
  const viewport = VIEWPORTS[name];
  if (!viewport) throw new Error(`unknown review viewport '${name}'`);
  await page.setViewportSize(viewport);
  return viewport;
}

export async function setReducedMotion(page, reduce = true) {
  await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
}

export async function coarsePointerMatches(page) {
  return page.evaluate(() => matchMedia('(pointer: coarse)').matches);
}

export async function computedStyle(locator, property) {
  return locator.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property);
}

/** Click the painted centre of a projected label through its coarse hit area. */
export async function clickProjectedLabel(page, text) {
  const label = page.locator('#scienceOverlay .identity-label').filter({ hasText: text });
  await expect(label).toHaveCount(1);
  // Playwright WebKit reports SVGTextElement.boundingBox() in local glyph
  // coordinates rather than viewport coordinates. The DOM rectangle is the
  // actual painted viewport box a reader points at in every engine.
  const box = await label.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  });
  expect(box, `projected ${text} label must have a painted box`).not.toBeNull();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

export async function effectiveBackground(locator) {
  return locator.evaluate((node) => {
    const parse = (css) => {
      const values = [...css.matchAll(/[\d.]+/g)].map((match) => Number(match[0]));
      return [values[0] || 0, values[1] || 0, values[2] || 0,
        values.length > 3 ? values[3] : 1];
    };
    const over = (front, back) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      return [
        (front[0] * front[3] + back[0] * back[3] * (1 - front[3])) / alpha,
        (front[1] * front[3] + back[1] * back[3] * (1 - front[3])) / alpha,
        (front[2] * front[3] + back[2] * back[3] * (1 - front[3])) / alpha,
        alpha,
      ];
    };
    const layers = [];
    for (let current = node; current; current = current.parentElement) {
      layers.push(parse(getComputedStyle(current).backgroundColor));
    }
    const result = layers.reverse().reduce((background, layer) => over(layer, background),
      [255, 255, 255, 1]);
    return `rgb(${result.slice(0, 3).map(Math.round).join(', ')})`;
  });
}

export async function boxesCollide(first, second) {
  const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  if (!a || !b) return false;
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** SC-27A §3.3: count painted chrome, excluding projected science targets. */
export async function chromeCounts(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll(
      'button, input, select, textarea, a[href], [role="button"], [role="tab"]',
    )];
    const visible = candidates.filter((node) => {
      if (node.closest('#scienceOverlay, #objectTooltip, #objectLeader')) return false;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden'
          || Number(style.opacity) === 0) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0
        && rect.right > 0 && rect.bottom > 0
        && rect.left < innerWidth && rect.top < innerHeight;
    });
    return {
      visible: visible.length,
      tabbable: visible.filter((node) => !node.disabled && node.tabIndex >= 0).length,
      visibleIds: visible.map((node) => node.id || node.getAttribute('aria-label') || node.textContent.trim()),
      tabbableIds: visible.filter((node) => !node.disabled && node.tabIndex >= 0)
        .map((node) => node.id || node.getAttribute('aria-label') || node.textContent.trim()),
    };
  });
}

export async function horizontalOverflow(page) {
  return page.evaluate(() => ({
    document: document.documentElement.scrollWidth - innerWidth,
    body: document.body.scrollWidth - innerWidth,
    canvas: document.querySelector('#canvas')?.scrollLeft || 0,
  }));
}

export async function visibleWordCount(page, selector = 'body') {
  return page.locator(selector).evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const words = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden'
          || parent.closest('[hidden], .sr-only')) continue;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.right <= 0 || rect.bottom <= 0
          || rect.left >= innerWidth || rect.top >= innerHeight) continue;
      words.push(...(node.textContent.trim().match(/\S+/g) || []));
    }
    return words.length;
  });
}

/**
 * SC-24. A thrown module error paints #err over the whole stage and is never
 * cleared, so any assertion made after one is worthless. The full suite once
 * passed while a primary control was killing the page on its first click, which
 * is why the runtime-error channel is now a standing gate rather than something
 * an individual test has to remember to check.
 */
export function failOnPageErrors(test) {
  const errors = [];
  test.beforeEach(({ page }) => {
    errors.length = 0;
    page.on('pageerror', (error) => errors.push(error.message));
  });
  test.afterEach(() => {
    expect(errors, 'the page must raise no runtime error').toEqual([]);
  });
}

export async function waitForReady(page) {
  await page.waitForFunction(() => window.__titinBoot?.ready === true);
  await expect(page.locator('#err')).toBeHidden();
  await expect(page.locator('#canvas canvas')).toBeVisible();
}

export function relativeLuminance(cssRgb) {
  const channels = [...cssRgb.matchAll(/[\d.]+/g)].slice(0, 3).map((match) => Number(match[0]) / 255);
  const linear = channels.map((value) => (value <= 0.04045
    ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(foreground, background) {
  const [high, low] = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}
