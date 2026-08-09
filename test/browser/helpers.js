import { expect } from '@playwright/test';

export const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1280, height: 720 }),
  responsive: Object.freeze({ width: 375, height: 812 }),
});

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
