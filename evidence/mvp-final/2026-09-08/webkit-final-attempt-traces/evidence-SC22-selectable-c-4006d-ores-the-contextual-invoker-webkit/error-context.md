# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evidence.spec.js >> SC22 selectable chart point filters sources and restores the contextual invoker
- Location: test/browser/evidence.spec.js:112:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.setViewportSize: Test timeout of 60000ms exceeded.
```

# Test source

```ts
  1   | import { expect } from '@playwright/test';
  2   | 
  3   | export const VIEWPORTS = Object.freeze({
  4   |   desktop: Object.freeze({ width: 1280, height: 720 }),
  5   |   responsive: Object.freeze({ width: 375, height: 812 }),
  6   | });
  7   | 
  8   | export const SC27A_VIEWPORTS = Object.freeze([
  9   |   Object.freeze({ width: 375, height: 812 }),
  10  |   Object.freeze({ width: 390, height: 844 }),
  11  |   Object.freeze({ width: 768, height: 1024 }),
  12  |   Object.freeze({ width: 1024, height: 768 }),
  13  |   Object.freeze({ width: 1280, height: 720 }),
  14  |   Object.freeze({ width: 1440, height: 900 }),
  15  | ]);
  16  | 
  17  | export async function setReviewViewport(page, name) {
  18  |   const viewport = VIEWPORTS[name];
  19  |   if (!viewport) throw new Error(`unknown review viewport '${name}'`);
> 20  |   await page.setViewportSize(viewport);
      |              ^ Error: page.setViewportSize: Test timeout of 60000ms exceeded.
  21  |   return viewport;
  22  | }
  23  | 
  24  | export async function setReducedMotion(page, reduce = true) {
  25  |   await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
  26  | }
  27  | 
  28  | export async function coarsePointerMatches(page) {
  29  |   return page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  30  | }
  31  | 
  32  | export async function computedStyle(locator, property) {
  33  |   return locator.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property);
  34  | }
  35  | 
  36  | /** Click the painted centre of a projected label through its coarse hit area. */
  37  | export async function clickProjectedLabel(page, text) {
  38  |   const label = page.locator('#scienceOverlay .identity-label').filter({ hasText: text });
  39  |   await expect(label).toHaveCount(1);
  40  |   // Playwright WebKit reports SVGTextElement.boundingBox() in local glyph
  41  |   // coordinates rather than viewport coordinates. The DOM rectangle is the
  42  |   // actual painted viewport box a reader points at in every engine.
  43  |   const box = await label.evaluate((node) => {
  44  |     const rect = node.getBoundingClientRect();
  45  |     return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  46  |   });
  47  |   expect(box, `projected ${text} label must have a painted box`).not.toBeNull();
  48  |   await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  49  | }
  50  | 
  51  | export async function effectiveBackground(locator) {
  52  |   return locator.evaluate((node) => {
  53  |     const parse = (css) => {
  54  |       const values = [...css.matchAll(/[\d.]+/g)].map((match) => Number(match[0]));
  55  |       return [values[0] || 0, values[1] || 0, values[2] || 0,
  56  |         values.length > 3 ? values[3] : 1];
  57  |     };
  58  |     const over = (front, back) => {
  59  |       const alpha = front[3] + back[3] * (1 - front[3]);
  60  |       if (alpha === 0) return [0, 0, 0, 0];
  61  |       return [
  62  |         (front[0] * front[3] + back[0] * back[3] * (1 - front[3])) / alpha,
  63  |         (front[1] * front[3] + back[1] * back[3] * (1 - front[3])) / alpha,
  64  |         (front[2] * front[3] + back[2] * back[3] * (1 - front[3])) / alpha,
  65  |         alpha,
  66  |       ];
  67  |     };
  68  |     const layers = [];
  69  |     for (let current = node; current; current = current.parentElement) {
  70  |       layers.push(parse(getComputedStyle(current).backgroundColor));
  71  |     }
  72  |     const result = layers.reverse().reduce((background, layer) => over(layer, background),
  73  |       [255, 255, 255, 1]);
  74  |     return `rgb(${result.slice(0, 3).map(Math.round).join(', ')})`;
  75  |   });
  76  | }
  77  | 
  78  | export async function boxesCollide(first, second) {
  79  |   const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  80  |   if (!a || !b) return false;
  81  |   return a.x < b.x + b.width && a.x + a.width > b.x
  82  |     && a.y < b.y + b.height && a.y + a.height > b.y;
  83  | }
  84  | 
  85  | /** SC-27A §3.3: count painted chrome, excluding projected science targets. */
  86  | export async function chromeCounts(page) {
  87  |   return page.evaluate(() => {
  88  |     const candidates = [...document.querySelectorAll(
  89  |       'button, input, select, textarea, a[href], [role="button"], [role="tab"]',
  90  |     )];
  91  |     const visible = candidates.filter((node) => {
  92  |       if (node.closest('#scienceOverlay, #objectTooltip, #objectLeader')) return false;
  93  |       const style = getComputedStyle(node);
  94  |       if (style.display === 'none' || style.visibility === 'hidden'
  95  |           || Number(style.opacity) === 0) return false;
  96  |       const rect = node.getBoundingClientRect();
  97  |       return rect.width > 0 && rect.height > 0
  98  |         && rect.right > 0 && rect.bottom > 0
  99  |         && rect.left < innerWidth && rect.top < innerHeight;
  100 |     });
  101 |     return {
  102 |       visible: visible.length,
  103 |       tabbable: visible.filter((node) => !node.disabled && node.tabIndex >= 0).length,
  104 |       visibleIds: visible.map((node) => node.id || node.getAttribute('aria-label') || node.textContent.trim()),
  105 |       tabbableIds: visible.filter((node) => !node.disabled && node.tabIndex >= 0)
  106 |         .map((node) => node.id || node.getAttribute('aria-label') || node.textContent.trim()),
  107 |     };
  108 |   });
  109 | }
  110 | 
  111 | export async function horizontalOverflow(page) {
  112 |   return page.evaluate(() => ({
  113 |     document: document.documentElement.scrollWidth - innerWidth,
  114 |     body: document.body.scrollWidth - innerWidth,
  115 |     canvas: document.querySelector('#canvas')?.scrollLeft || 0,
  116 |   }));
  117 | }
  118 | 
  119 | export async function visibleWordCount(page, selector = 'body') {
  120 |   return page.locator(selector).evaluate((root) => {
```