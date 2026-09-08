// Layout audit of the six static fallback slides; a one-off evidence aid, not a
// release gate. It renders each SVG at its own 1920x1080 viewBox and reads real
// getBBox() geometry, so a finding is a measured overlap or overflow rather than a
// guess from character counts. Run from the repository root:
//
//   node evidence/mvp-final/2026-09-08/fallback_audit.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SLIDES = ['scope', 'architecture', 'extension', 'lattice', 'provenance', 'limitations'];
const root = resolve(import.meta.dirname, '../../..');

const browser = await chromium.launch();
const slides = [];
mkdirSync(resolve(import.meta.dirname, 'fallback-frames'), { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const slide of SLIDES) {
    await page.goto(pathToFileURL(resolve(root, `release/fallback/${slide}.svg`)).href);
    const audit = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      const view = svg.viewBox.baseVal;
      // getBBox() returns an SVGRect whose x/y/width/height live on the prototype as
      // accessors, so spreading it yields an object with none of them. Read explicitly.
      const nodes = [...svg.querySelectorAll('text')].map((node) => {
        const box = node.getBBox();
        return {
          text: node.textContent.trim(),
          x: box.x, y: box.y, width: box.width, height: box.height,
        };
      });
      const overflow = nodes.filter((n) => (
        n.x < view.x - 0.5 || n.x + n.width > view.x + view.width + 0.5
        || n.y < view.y - 0.5 || n.y + n.height > view.y + view.height + 0.5
      )).map((n) => ({
        text: n.text,
        right_px: Math.round(n.x + n.width),
        bottom_px: Math.round(n.y + n.height),
        overflow_px: Math.round(Math.max(
          n.x + n.width - (view.x + view.width), n.y + n.height - (view.y + view.height),
        )),
      }));
      const collisions = [];
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (overlapX > 0.5 && overlapY > 0.5) {
            collisions.push({
              a: a.text, b: b.text,
              overlap_px: { x: Math.round(overlapX), y: Math.round(overlapY) },
            });
          }
        }
      }
      return { text_nodes: nodes.length, overflow, collisions };
    });
    await page.screenshot({ path: resolve(import.meta.dirname, `fallback-frames/${slide}.png`) });
    slides.push({ slide, ...audit });
  }
  await page.close();
} finally {
  await browser.close();
}

writeFileSync(resolve(import.meta.dirname, 'fallback_audit.json'), `${JSON.stringify({
  note: 'Measured getBBox geometry for every <text> in the six static fallback slides.',
  viewbox: { width: 1920, height: 1080 },
  slides,
}, null, 2)}\n`);
const findings = slides.reduce(
  (total, s) => total + s.overflow.length + s.collisions.length, 0,
);
process.stdout.write(`Audited ${slides.length} fallback slides; ${findings} layout findings.\n`);
