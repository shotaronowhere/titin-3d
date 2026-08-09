#!/usr/bin/env node
/** Print a reproducible SC-18 Chromium performance sample; does not edit evidence. */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const port = 4174;
const server = spawn(process.execPath, ['scripts/serve_browser_tests.mjs', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

async function health() {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) return;
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`browser test server did not start: ${lastError?.message || 'timeout'}`);
}

let browser;
try {
  await health();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  const start = performance.now();
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__titinBoot?.ready === true);
  const startupMs = performance.now() - start;

  const frameTimes = await page.evaluate(() => new Promise((resolve) => {
    const samples = [];
    const frame = (time) => {
      samples.push(time);
      if (samples.length >= 121) resolve(samples);
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }));
  const intervals = frameTimes.slice(1).map((time, index) => time - frameTimes[index]);
  const sorted = [...intervals].sort((a, b) => a - b);
  const percentile = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];

  const interactionMs = await page.evaluate(() => new Promise((resolve) => {
    const started = performance.now();
    document.getElementById('stageMeasureLink').click();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - started)));
  }));
  await page.waitForFunction(() => document.getElementById('tabMeasure')?.getAttribute('aria-selected') === 'true');

  const memory = await page.evaluate(() => {
    const value = performance.memory;
    return value ? {
      used_js_heap_bytes: value.usedJSHeapSize,
      total_js_heap_bytes: value.totalJSHeapSize,
      js_heap_limit_bytes: value.jsHeapSizeLimit,
    } : null;
  });
  const navigation = await page.evaluate(() => {
    const row = performance.getEntriesByType('navigation')[0];
    return row ? {
      response_end_ms: row.responseEnd,
      dom_content_loaded_ms: row.domContentLoadedEventEnd,
      load_event_end_ms: row.loadEventEnd,
      transfer_bytes: row.transferSize,
      decoded_body_bytes: row.decodedBodySize,
    } : null;
  });
  const output = {
    schema: 'titin-sc18-performance-sample/1',
    captured_on: new Date().toISOString(),
    browser: { engine: 'Chromium', version: browser.version(), headless: true },
    viewport: { width: 1280, height: 720, device_scale_factor: 1 },
    method: {
      startup: 'wall time from page.goto to window.__titinBoot.ready=true',
      frame_trace: '120 consecutive requestAnimationFrame intervals after ready',
      interaction: 'Measure click through two animation frames and selected-tab confirmation',
      memory: 'Chromium performance.memory after the interaction',
    },
    startup_ms: Number(startupMs.toFixed(3)),
    frame_trace_ms: intervals.map((value) => Number(value.toFixed(3))),
    frame_rate: {
      frames: intervals.length,
      duration_ms: Number((frameTimes.at(-1) - frameTimes[0]).toFixed(3)),
      average_fps: Number((1000 * intervals.length / (frameTimes.at(-1) - frameTimes[0])).toFixed(3)),
      p50_interval_ms: Number(percentile(0.5).toFixed(3)),
      p95_interval_ms: Number(percentile(0.95).toFixed(3)),
      max_interval_ms: Number(Math.max(...intervals).toFixed(3)),
    },
    interaction_latency_ms: Number(interactionMs.toFixed(3)),
    memory,
    navigation,
    errors,
  };
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
