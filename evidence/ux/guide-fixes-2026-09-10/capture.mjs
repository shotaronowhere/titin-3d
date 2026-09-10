import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch();
const results = [];
try {
  for (const [width, height] of [[320,568],[390,844],[768,1024],[844,390],[640,360],[1280,720]]) {
    const context = await browser.newContext({ viewport:{width,height}, hasTouch:width<1000, reducedMotion:'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4174/index.html#v=2&depth=learn&step=stretch_spring&sl=2200&drawer=closed&scene=spring&confidence=0');
    await page.waitForFunction(() => window.__titinBoot?.ready);
    for (const expanded of [false,true]) {
      if (await page.locator('#guideToggle').getAttribute('aria-expanded') !== String(expanded)) await page.locator('#guideToggle').click();
      // Wait for semantic framing and hint placement to finish before capture.
      await page.waitForFunction(() => document.querySelector('#inspectHint').dataset.overlayLayout === 'resolved');
      const state = expanded ? 'expanded' : 'collapsed';
      await page.screenshot({ path:`${out}${width}-${state}.png` });
      const layout = await page.evaluate(() => ({
        viewport: {width:innerWidth,height:innerHeight},
        overflow: {width:document.documentElement.scrollWidth-innerWidth,height:document.documentElement.scrollHeight-innerHeight},
        verdict: document.querySelector('#scienceOverlay').dataset.labelLayout,
        findings: document.querySelector('#scienceOverlay').dataset.labelLayoutDetail,
        card: document.querySelector('#guidedCard').getBoundingClientRect().toJSON(),
        guide: document.querySelector('#guideContent').getBoundingClientRect().toJSON(),
      }));
      const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      writeFileSync(`${out}axe-${width}-${state}.json`, JSON.stringify(axe,null,2));
      results.push({width,height,state,layout,pageErrors:[...errors],axeViolations:axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
      console.log(JSON.stringify(results.at(-1)));
    }
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${out}verification.json`,JSON.stringify({
    capturedAt: new Date().toISOString(),
    indexSha256:createHash('sha256').update(readFileSync(new URL('../../../index.html',import.meta.url))).digest('hex'),
    results,
  },null,2));
}
if(results.some(r=>r.pageErrors.length||r.axeViolations.length||r.layout.overflow.width>0||r.layout.overflow.height>0||r.layout.verdict==='unresolved'))process.exitCode=1;
