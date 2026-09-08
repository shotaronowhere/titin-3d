import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { waitForReady } from '../../../test/browser/helpers.js';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
const records=[];
async function record(label) {
 records.push({label,...await page.evaluate(()=>({
  length:document.querySelector('#sl').value, play:document.querySelector('#stagePlay').textContent,
  elements:Object.fromEntries(['guidedCard','stagePlay','stageForce','sl','stageLengthReadout','stageHeader'].map(id=>{
   const n=document.getElementById(id),b=n.getBoundingClientRect();return[id,{x:b.x,y:b.y,width:b.width,height:b.height,text:n.innerText}];
  })),points:window.titinVisualization.projectPresentationAnchors([{id:'z',x:0,y:0,z:0},{id:'m',x:1200,y:0,z:0}]),
 }))});
}
await page.goto(pathToFileURL(resolve('index.html')).href); await waitForReady(page);
await page.locator('#chapterNext').click(); await page.locator('#chapterNext').click();
await record('entry');
await page.locator('#stagePlay').click();await page.waitForFunction(()=>document.querySelector('#sl').value==='2400');await record('endpoint');
await page.locator('#stagePlay').click();await page.waitForFunction(()=>document.querySelector('#sl').value==='2400');await record('replay endpoint');
await page.locator('#sl').fill('2200');await record('slider 2200');
await browser.close();writeFileSync(resolve(import.meta.dirname,'camera_probe.json'),JSON.stringify(records,null,2)+'\n');
