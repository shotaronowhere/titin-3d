import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
import {waitForReady} from '../../../test/browser/helpers.js';
const out=import.meta.dirname;
const pack=JSON.parse(readFileSync(`${out}/superseded-4f82703/package.json`));
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto(`file://${pack.extracted}/index.html`); await waitForReady(page);
 await page.locator('#chapterNext').click();await page.locator('#chapterNext').click();
 await page.locator('#stagePlay').click();await page.waitForFunction(()=>document.querySelector('#sl').value==='2400');
 await page.locator('#stageForce').click();await page.waitForFunction(()=>document.activeElement.id==='passiveForceHeading');
 await page.locator('#closeEvidence').click();await page.locator('#chapterNext').click();await page.locator('#chapterNext').click();
 await page.locator('#chapterInspectEvidence').click();
 await page.waitForFunction(()=>document.activeElement.id==='closeEvidence');
 const state=await page.evaluate(()=>({scroll:document.querySelector('#panel').scrollTop,source:document.querySelector('#selectedEvidenceSourcesLink').getBoundingClientRect().toJSON(),active:document.activeElement.id}));
 console.log(JSON.stringify(state));
 await page.screenshot({path:`${out}/evidence-scroll-probe.png`});
 writeFileSync(`${out}/evidence-scroll-probe.json`,JSON.stringify(state,null,2)+'\n');
}finally{await browser.close()}
