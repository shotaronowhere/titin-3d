// Review probe only: transient styles are applied in an isolated browser page.
// This does not modify the application, generated artifacts, or delivery ZIP.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { waitForReady } from '../../../test/browser/helpers.js';

const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    page.setDefaultTimeout(20000);
    await page.goto(pathToFileURL(resolve('index.html')).href
      + '#v=2&depth=learn&step=stretch_spring&sl=2400&drawer=closed&scene=spring&confidence=0');
    await waitForReady(page);
    await page.locator('#stageForce').click();
    await page.locator('#forceCurve .force-chart').waitFor({ state: 'visible' });
    for (const font of [12, 18, 24]) {
      if (font !== 12) await page.addStyleTag({ content: `.mechanics-audit .force-chart text { font-size: ${font}px; }` });
      results.push(await page.locator('#forceCurve .force-chart').evaluate((svg, input) => {
        const rect = svg.getBoundingClientRect();
        const labels = [...svg.querySelectorAll('text')].map(node => {
          const r = node.getBoundingClientRect();
          const ctm = node.getScreenCTM();
          const font = parseFloat(getComputedStyle(node).fontSize);
          return { text: node.textContent, fontUserUnits: font,
            fontScreenPx: font * Math.hypot(ctm.c, ctm.d),
            box: { x: r.x, y: r.y, width: r.width, height: r.height },
            outside: r.left < rect.left || r.right > rect.right || r.top < rect.top || r.bottom > rect.bottom };
        });
        const collisions = [];
        for (let i = 0; i < labels.length; i++) for (let j = i+1; j < labels.length; j++) {
          const a = labels[i].box, b = labels[j].box;
          if (Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>0.5
              && Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>0.5) {
            collisions.push([labels[i].text, labels[j].text]);
          }
        }
        return { ...input, chartWidth: rect.width, drawerWidth: document.querySelector('#panel').getBoundingClientRect().width,
          effectiveFontPx: labels[0].fontScreenPx,
          clipped: labels.filter(x=>x.outside).map(x=>({text:x.text,box:x.box})), collisions };
      }, { viewport, fontUserUnits: font }));
    }
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(new URL('./chart-measurements.json', import.meta.url), JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
