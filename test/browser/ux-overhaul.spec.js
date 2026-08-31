import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STAGE_LAYOUT } from '../../src/presentation/StageLayout.js';

import {
  SC27A_VIEWPORTS,
  boxesCollide,
  clickProjectedLabel,
  chromeCounts,
  failOnPageErrors,
  horizontalOverflow,
  setReducedMotion,
  visibleWordCount,
  waitForReady,
} from './helpers.js';

failOnPageErrors(test);

const consoleErrors = [];
test.beforeEach(({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
});
test.afterEach(() => expect(consoleErrors, 'the page must log no console error').toEqual([]));

const SC27A_BEATS = Object.freeze([
  'meet_sarcomere',
  'follow_titin',
  'stretch_spring',
  'scaffold_thick_filament',
  'knowledge_recap',
]);
const SC27A_SCENES = Object.freeze([
  'overview',
  'titin_alone',
  'spring',
  'architecture',
  'z_anchor',
  'a_band_scaffold',
  'lattice',
]);

async function openTour(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await waitForReady(page);
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
  await expect(page.locator('#tourProgressMarkers .tour-progress-marker')).toHaveCount(5);
}

async function assertInViewport(locator, viewport) {
  const box = await locator.boundingBox();
  expect(box, 'element has a rendered box').not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function assertShellFocusContainment(page, viewport) {
  const records = await page.locator('#stageHeader button, #guidedCard button, #guidedCard input')
    .evaluateAll((nodes) => nodes.flatMap((node) => {
      const before = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (node.disabled || node.tabIndex < 0 || style.display === 'none'
          || style.visibility === 'hidden' || before.width <= 0 || before.height <= 0) return [];
      node.focus();
      const rect = node.getBoundingClientRect();
      return [{
        id: node.id,
        focused: document.activeElement === node,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        documentOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        canvasOverflow: Math.max(0,
          document.querySelector('#canvas').scrollWidth - document.querySelector('#canvas').clientWidth),
      }];
    }));
  expect(records.map(({ id }) => id)).toContain('audienceEvidence');
  for (const record of records) {
    expect(record.focused, `${record.id} receives focus`).toBe(true);
    expect(record.left, `${record.id} left edge`).toBeGreaterThanOrEqual(-1);
    expect(record.top, `${record.id} top edge`).toBeGreaterThanOrEqual(-1);
    expect(record.right, `${record.id} right edge`).toBeLessThanOrEqual(viewport.width + 1);
    expect(record.bottom, `${record.id} bottom edge`).toBeLessThanOrEqual(viewport.height + 1);
    expect(record.documentOverflow, `${record.id} document overflow`).toBeLessThanOrEqual(1);
    expect(record.canvasOverflow, `${record.id} canvas overflow`).toBe(0);
  }
}

async function assertCentreUnobscured(locator) {
  expect(await locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === node || node.contains(hit) || hit?.contains(node);
  })).toBe(true);
}

async function assertContainedBy(child, parent) {
  const [inside, outside] = await Promise.all([child.boundingBox(), parent.boundingBox()]);
  expect(inside, 'contained element has a rendered box').not.toBeNull();
  expect(outside, 'containing element has a rendered box').not.toBeNull();
  expect(inside.x).toBeGreaterThanOrEqual(outside.x - 1);
  expect(inside.y).toBeGreaterThanOrEqual(outside.y - 1);
  expect(inside.x + inside.width).toBeLessThanOrEqual(outside.x + outside.width + 1);
  expect(inside.y + inside.height).toBeLessThanOrEqual(outside.y + outside.height + 1);
}

async function openTourState(page, viewport, beat, scene) {
  await page.setViewportSize(viewport);
  await setReducedMotion(page, true);
  await page.goto(`/#v=2&depth=learn&step=${beat}&sl=2200&drawer=closed&scene=${scene}&confidence=0`);
  await waitForReady(page);
  await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', 'resolved');
  await expect(page.locator('#inspectHint')).toHaveAttribute('data-overlay-layout', 'resolved');
}

/** Every painted overlay label family, using the same >3 px overprint rule as runtime. */
async function assertOverlayLabelsClear(page, viewport, stateLabel) {
  const audit = await page.evaluate((tolerance) => {
    const canvas = document.querySelector('#canvas').getBoundingClientRect();
    const overlay = document.querySelector('#scienceOverlay');
    const hint = document.querySelector('#inspectHint');
    const hintRect = hint.hidden ? null : hint.getBoundingClientRect();
    const labels = [...overlay.querySelectorAll('text')].flatMap((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return [];
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return [{
        text: node.textContent.trim(),
        left: rect.left - canvas.left,
        right: rect.right - canvas.left,
        top: rect.top - canvas.top,
        bottom: rect.bottom - canvas.top,
        coveredByChrome: !hit || (!overlay.contains(hit) && hit.tagName !== 'CANVAS'),
      }];
    });
    const collisions = [];
    for (let i = 0; i < labels.length; i += 1) {
      for (let j = i + 1; j < labels.length; j += 1) {
        const a = labels[i];
        const b = labels[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > tolerance && overlapY > tolerance) {
          collisions.push(`${a.text} ↔ ${b.text} (${overlapX.toFixed(1)}×${overlapY.toFixed(1)} px)`);
        }
      }
    }
    const hintCollisions = hintRect ? labels.filter((label) => (
      label.right > hintRect.left - canvas.left
      && label.left < hintRect.right - canvas.left
      && label.bottom > hintRect.top - canvas.top
      && label.top < hintRect.bottom - canvas.top
    )).map(({ text }) => text) : [];
    return {
      labels,
      collisions,
      hintCollisions,
      layout: overlay.dataset.labelLayout,
      hintLayout: hint.dataset.overlayLayout,
    };
  }, STAGE_LAYOUT.label_collision_tolerance_px);
  expect(audit.layout, `${stateLabel} runtime placement resolved`).toBe('resolved');
  expect(audit.hintLayout, `${stateLabel} inspection invitation placement resolved`).toBe('resolved');
  expect(audit.labels.length, `${stateLabel} paints scientific labels`).toBeGreaterThan(0);
  expect(audit.collisions, `${stateLabel} has no scientific-label overprint`).toEqual([]);
  expect(audit.hintCollisions, `${stateLabel} hint clears every scientific label`).toEqual([]);
  for (const label of audit.labels) {
    expect(label.left, `${stateLabel}: ${label.text} begins in viewport`).toBeGreaterThanOrEqual(-1);
    expect(label.right, `${stateLabel}: ${label.text} ends in viewport`)
      .toBeLessThanOrEqual(viewport.width + 1);
    expect(label.top, `${stateLabel}: ${label.text} begins in viewport`).toBeGreaterThanOrEqual(-1);
    expect(label.bottom, `${stateLabel}: ${label.text} ends in viewport`)
      .toBeLessThanOrEqual(viewport.height + 1);
    expect(label.coveredByChrome, `${stateLabel}: ${label.text} centre is unobscured`).toBe(false);
  }
}

async function assertSemanticCameraContract(page, viewport, beat) {
  await expect(page.locator('#scienceOverlay [data-full-sarcomere-locator]')).toHaveCount(1);
  const audit = await page.evaluate(() => {
    const vis = window.titinVisualization;
    const canvasNode = document.querySelector('#canvas');
    const overlayNode = document.querySelector('#scienceOverlay');
    const canvas = canvasNode.getBoundingClientRect();
    const header = document.querySelector('#stageHeader').getBoundingClientRect();
    const story = document.querySelector('#guidedCard').getBoundingClientRect();
    const relativeBox = (node) => {
      const rect = node?.getBoundingClientRect();
      return rect ? {
        left: rect.left - canvas.left,
        right: rect.right - canvas.left,
        top: rect.top - canvas.top,
        bottom: rect.bottom - canvas.top,
        width: rect.width,
      } : null;
    };
    const ruleNode = document.querySelector('#scienceOverlay .locator-rule');
    const rule = relativeBox(ruleNode);
    const ruleCoordinates = [...ruleNode.getAttribute('d').matchAll(/-?[\d.]+/g)]
      .map((match) => Number(match[0]));
    const extentNode = document.querySelector('#scienceOverlay .locator-extent');
    const extent = relativeBox(extentNode);
    const transformedX = (node, x, y) => {
      const point = overlayNode.createSVGPoint();
      point.x = x; point.y = y;
      return point.matrixTransform(node.getScreenCTM()).x - canvas.left;
    };
    const extentX = Number(extentNode.getAttribute('x'));
    const extentY = Number(extentNode.getAttribute('y'));
    const extentWidth = Number(extentNode.getAttribute('width'));
    const locatorLabels = [...document.querySelectorAll('#scienceOverlay .science-label')]
      .filter((node) => {
        if (!rule) return false;
        const box = relativeBox(node);
        return box && box.top >= rule.top - 30 && box.bottom <= rule.bottom + 38;
      });
    const semanticLabels = [
      ...locatorLabels,
      ...document.querySelectorAll('#scienceOverlay .terminus-label'),
    ].map((node) => {
      const box = relativeBox(node);
      const hit = document.elementFromPoint(
        canvas.left + (box.left + box.right) / 2,
        canvas.top + (box.top + box.bottom) / 2,
      );
      const intersects = (obstacle) => (
        box.left < obstacle.right - canvas.left
        && box.right > obstacle.left - canvas.left
        && box.top < obstacle.bottom - canvas.top
        && box.bottom > obstacle.top - canvas.top
      );
      return {
        text: node.textContent.trim(),
        box,
        coveredByChrome: !hit || (!overlayNode.contains(hit) && hit.tagName !== 'CANVAS'),
        intersectsHeader: intersects(header),
        intersectsStory: intersects(story),
      };
    });
    const labelCollisions = [];
    for (let i = 0; i < semanticLabels.length; i += 1) {
      for (let j = i + 1; j < semanticLabels.length; j += 1) {
        const a = semanticLabels[i];
        const b = semanticLabels[j];
        if (a.box.left < b.box.right && a.box.right > b.box.left
            && a.box.top < b.box.bottom && a.box.bottom > b.box.top) {
          labelCollisions.push(`${a.text} ↔ ${b.text}`);
        }
      }
    }
    const termini = vis.projectPresentationAnchors(vis.showcaseOverlay().termini)
      .map((point) => {
        const hit = document.elementFromPoint(
          canvas.left + point.x_px, canvas.top + point.y_px,
        );
        return {
          ...point,
          coveredByChrome: !hit || (!overlayNode.contains(hit) && hit.tagName !== 'CANVAS'),
        };
      });
    const pathPoints = vis.titinPickPaths().paths.flatMap((path) => path.points)
      .map((point, index) => ({ id: `path:${index}`, ...point }));
    const reachablePathPoints = vis.projectPresentationAnchors(pathPoints)
      .filter((point) => {
        if (!point.visible) return false;
        const hit = document.elementFromPoint(
          canvas.left + point.x_px, canvas.top + point.y_px,
        );
        return hit && (hit.tagName === 'CANVAS' || overlayNode.contains(hit));
      }).length;
    return {
      canvas: { width: canvas.width, height: canvas.height },
      locatorTicks: document.querySelectorAll('#scienceOverlay .locator-tick').length,
      locatorAnchors: document.querySelectorAll('#scienceOverlay .locator-anchor').length,
      locatorLabels: locatorLabels.map((node) => node.textContent.trim()),
      rule,
      extent: extent && { ...extent, span: extentNode.dataset.visibleSpan },
      locatorMath: {
        ruleLeft: transformedX(ruleNode, ruleCoordinates[0], ruleCoordinates[1]),
        ruleRight: transformedX(ruleNode, ruleCoordinates[2], ruleCoordinates[1]),
        extentLeft: transformedX(extentNode, extentX, extentY),
        extentRight: transformedX(extentNode, extentX + extentWidth, extentY),
      },
      semanticLabels,
      labelCollisions,
      bandLabelCount: document.querySelectorAll('#scienceOverlay .band-label').length,
      termini,
      reachablePathPoints,
    };
  });

  expect(audit.locatorTicks, `beat ${beat} has two Z boundaries and one M-line`).toBe(3);
  expect(audit.locatorAnchors, `beat ${beat} locator has both titin termini`).toBe(2);
  const stripPx = Math.max(210, Math.min(420, viewport.width - 36, viewport.width * 0.4));
  const expectedLocatorLabels = stripPx < STAGE_LAYOUT.locator_full_labels_min_px
    ? ['Z · N', 'M · C', 'Z', 'I-band', 'A-band']
    : ['Z-disc · N-terminus', 'M-line · C-terminus', 'Z-disc', 'I-band', 'A-band'];
  expect(audit.locatorLabels, `beat ${beat} locator vocabulary`)
    .toEqual(expect.arrayContaining(expectedLocatorLabels));
  expect(audit.semanticLabels.length, `beat ${beat} paints locator and termini labels`)
    .toBeGreaterThanOrEqual(7);
  expect(audit.bandLabelCount, `beat ${beat} gives the Tour lane only to the locator`).toBe(0);
  expect(audit.labelCollisions, `beat ${beat} scientific labels do not overprint`).toEqual([]);
  for (const label of audit.semanticLabels) {
    expect(label.box.left, `${label.text} begins in the viewport`).toBeGreaterThanOrEqual(0);
    expect(label.box.right, `${label.text} ends in the viewport`).toBeLessThanOrEqual(audit.canvas.width);
    expect(label.box.top, `${label.text} begins in the viewport`).toBeGreaterThanOrEqual(0);
    expect(label.box.bottom, `${label.text} ends in the viewport`).toBeLessThanOrEqual(audit.canvas.height);
    expect(label.coveredByChrome, `${label.text} is not covered by chrome`).toBe(false);
    expect(label.intersectsHeader, `${label.text} clears the header`).toBe(false);
    expect(label.intersectsStory, `${label.text} clears the Tour card`).toBe(false);
  }
  for (const terminus of audit.termini) {
    expect(terminus.visible, `${terminus.id} is projected`).toBe(true);
    expect(terminus.x_px, `${terminus.id} x`).toBeGreaterThanOrEqual(0);
    expect(terminus.x_px, `${terminus.id} x`).toBeLessThanOrEqual(audit.canvas.width);
    expect(terminus.y_px, `${terminus.id} y`).toBeGreaterThanOrEqual(0);
    expect(terminus.y_px, `${terminus.id} y`).toBeLessThanOrEqual(audit.canvas.height);
    expect(terminus.coveredByChrome, `${terminus.id} is not behind chrome`).toBe(false);
  }
  expect(audit.reachablePathPoints, `beat ${beat} leaves titin visible and reachable`)
    .toBeGreaterThan(0);
  const [from, to] = audit.extent.span.split(':').map(Number);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeLessThanOrEqual(1);
  expect(to).toBeGreaterThanOrEqual(from);
  const renderedRuleWidth = audit.locatorMath.ruleRight - audit.locatorMath.ruleLeft;
  expect(audit.locatorMath.extentLeft)
    .toBeCloseTo(audit.locatorMath.ruleLeft + renderedRuleWidth * from * 0.5, 4);
  expect(audit.locatorMath.extentRight - audit.locatorMath.extentLeft)
    .toBeCloseTo(Math.max(2, renderedRuleWidth * (to - from) * 0.5), 4);
}

for (const viewport of SC27A_VIEWPORTS) {
  test(`SC27A Tour shell obeys its viewport contract at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openTour(page, viewport);

    const counts = await chromeCounts(page);
    expect(counts.visibleIds).toEqual([
      'scopeBadge', 'audienceEvidence', 'chapterPrevious', 'chapterNext',
    ]);
    expect(counts.visible).toBeLessThanOrEqual(4);
    expect(counts.tabbable).toBeLessThanOrEqual(3);
    expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });
    expect(await visibleWordCount(page)).toBeLessThanOrEqual(110);
    if (viewport.width <= 767 || (viewport.height > viewport.width && viewport.width <= 1024)) {
      const compactScope = page.locator('#scopeCompact');
      await expect(compactScope).toHaveText('Human TTN Q8WZ42-1 · 2,200 nm');
      expect(await compactScope.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
        'compact scope label must not be visually truncated').toBe(true);
    }

    const card = page.locator('#guidedCard');
    const body = page.locator('#guidedCardBody');
    await assertInViewport(card, viewport);
    expect(await body.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
    await assertCentreUnobscured(page.locator('#chapterNext'));
    await expect(page.getByRole('button', { name: /^Next:/ })).toHaveCount(1);
    await assertShellFocusContainment(page, viewport);

    const header = page.locator('#stageHeader');
    expect(await boxesCollide(header, card)).toBe(false);
    const hint = page.locator('#inspectHint');
    if (await hint.isVisible()) {
      expect(await boxesCollide(header, hint)).toBe(false);
      expect(await boxesCollide(card, hint)).toBe(false);
    }

    await expect(page.locator('#scienceOverlay .identity-label')).toHaveText([
      'Titin', 'Myosin', 'Actin',
    ]);
    await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', 'resolved');
    for (const label of await page.locator('#scienceOverlay .identity-label').all()) {
      await assertInViewport(label, viewport);
    }

    // Every beat must obey the responsive shell contract. Beat 3 is densest,
    // beat 4 has the tallest card, and beat 5 is the closing frame whose
    // evidence recap previously obscured a terminus label at 1024x768.
    for (let beat = 2; beat <= 5; beat += 1) {
      await page.locator('#chapterNext').click();
      await expect(page.locator('#chapterProgress')).toHaveText(`Beat ${beat} of 5`);
      await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', 'resolved');
      await assertInViewport(page.locator('#guidedCard'), viewport);
      await assertInViewport(page.locator('#chapterNext'), viewport);
      await assertCentreUnobscured(page.locator('#chapterNext'));
      expect(await boxesCollide(page.locator('#stageHeader'), page.locator('#guidedCard'))).toBe(false);
      expect(await page.locator('#guidedCardBody')
        .evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
      expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });
      if (beat === 3) {
        await expect(page.locator('#tourMechanics')).toBeVisible();
        await assertContainedBy(page.locator('#stageForce'), page.locator('#guidedCard'));
      } else {
        await expect(page.locator('#tourMechanics')).toBeHidden();
      }
      await assertShellFocusContainment(page, viewport);
    }
  });
}

for (const viewport of SC27A_VIEWPORTS) {
  test(`SC27A semantic cameras clear chrome at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('titin.sc25.inspect-hint-seen', 'seen');
    });
    await setReducedMotion(page, true);
    await openTour(page, viewport);
    await assertSemanticCameraContract(page, viewport, 1);
    await page.locator('#chapterNext').click();
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 2 of 5');
    await assertSemanticCameraContract(page, viewport, 2);
    for (let beat = 3; beat <= 5; beat += 1) {
      await page.locator('#chapterNext').click();
      await expect(page.locator('#chapterProgress')).toHaveText(`Beat ${beat} of 5`);
    }
    await assertSemanticCameraContract(page, viewport, 5);
  });
}

for (const viewport of SC27A_VIEWPORTS) {
  for (const beat of SC27A_BEATS) {
    test(`SC27A every scene clears every overlay label at ${viewport.width}x${viewport.height} in ${beat}`, async ({ page }) => {
      // Seven independent cold boots include the lattice-heavy beat. Keep the
      // assertion waits strict while giving the group enough aggregate time on
      // constrained review hosts.
      test.setTimeout(120_000);
      for (const scene of SC27A_SCENES) {
        await openTourState(page, viewport, beat, scene);
        await assertOverlayLabelsClear(
          page, viewport, `${viewport.width}x${viewport.height} ${beat}/${scene}`,
        );
      }
    });
  }
}

test('SC27A has one five-beat route, contextual mechanics, and a truthful Replay', async ({ page }) => {
  await openTour(page, { width: 1280, height: 720 });
  const stageComposition = await page.locator('#canvas').evaluate((node) => {
    const canvas = node.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return {
      backgroundImage: getComputedStyle(node).backgroundImage,
      webglAlpha: gl.getContextAttributes().alpha,
      canvasBackground: getComputedStyle(canvas).backgroundColor,
    };
  });
  expect(stageComposition.backgroundImage).toContain('rgb(14, 17, 22)');
  expect(stageComposition.backgroundImage).toContain('rgb(8, 11, 15)');
  expect(stageComposition.webglAlpha).toBe(true);
  expect(stageComposition.canvasBackground).toBe('rgba(0, 0, 0, 0)');
  const expected = [
    ['Beat 1 of 5', 'Meet the sarcomere'],
    ['Beat 2 of 5', 'Follow one giant molecule'],
    ['Beat 3 of 5', 'Build and stretch the spring'],
    ['Beat 4 of 5', 'Scaffold the thick filament'],
    ['Beat 5 of 5', 'What do we know?'],
  ];

  for (const [index, [progress, title]] of expected.entries()) {
    await expect(page.locator('#chapterProgress')).toHaveText(progress);
    await expect(page.locator('#chapterTitle')).toHaveText(title);
    if (index === 2) await expect(page.locator('#tourMechanics')).toBeVisible();
    else await expect(page.locator('#tourMechanics')).toBeHidden();
    const counts = await chromeCounts(page);
    expect(counts.visible).toBeLessThanOrEqual(index === 2 ? 7 : 4);
    if (index < expected.length - 1) await page.locator('#chapterNext').click();
  }

  await expect(page.locator('#chapterNext')).toHaveText('Replay');
  await expect(page.locator('#tourEvidenceRecap .evidence-chip')).toHaveCount(5);
  await expect(page.locator('#tourEvidenceRecap .tour-evidence-definition')).toHaveCount(5);
  await expect(page.locator('#tourEvidenceRecap .evidence-chip[role="status"]')).toHaveCount(0);
  for (const definition of await page.locator('#tourEvidenceRecap .tour-evidence-definition').all()) {
    await expect(definition).not.toBeEmpty();
  }
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');
  await expect(page.locator('#chapterPrevious')).toBeDisabled();
});

test('SC27A presenter x accelerator enters the complete Stretch beat from anywhere', async ({ page }) => {
  await openTour(page, { width: 1280, height: 720 });
  await page.keyboard.press('x');
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
  await expect(page.locator('#chapterTitle')).toHaveText('Build and stretch the spring');
  await expect(page.locator('#tourMechanics')).toBeVisible();
  await expect(page).toHaveURL(/step=stretch_spring/);

  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 5 of 5');
  await page.keyboard.press('x');
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 3 of 5');
  await expect(page.locator('#tourMechanics')).toBeVisible();
});

test('SC27A Research defaults and contextual routes preserve the Tour return point', async ({ page }) => {
  await openTour(page, { width: 1280, height: 720 });
  await page.locator('#audienceEvidence').click();
  await expect(page.locator('#panel')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#tabInspect')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panelInspect')).toBeVisible();
  await expect(page.locator('.research-inventory')).not.toHaveAttribute('open', '');
  expect(await visibleWordCount(page, '#panel')).toBeLessThanOrEqual(220);
  const panelWidth = (await page.locator('#panel').boundingBox()).width;
  expect(panelWidth).toBeGreaterThanOrEqual(380);
  expect(panelWidth).toBeLessThanOrEqual(440);
  await expect(page.locator('#canvas canvas')).toBeVisible();
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#audienceEvidence')).toBeFocused();
  await expect(page.locator('#chapterProgress')).toHaveText('Beat 1 of 5');

  await page.locator('#scopeBadge').click();
  await expect(page.locator('#tabInspect')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#scopeDetails')).toBeFocused();
  await page.locator('#closeEvidence').click();

  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await expect(page.locator('#tourMechanics')).toBeVisible();
  await page.locator('#stageForce').click();
  await expect(page.locator('#tabMeasure')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panelMeasure')).toBeVisible();
});

test('SC27A object explanation reaches contextual Evidence and Sources', async ({ page }) => {
  await openTour(page, { width: 1280, height: 720 });
  await page.evaluate(() => {
    window.__sc27aOverlayClicks = 0;
    document.addEventListener('click', (event) => {
      if (event.composedPath().includes(document.querySelector('#scienceOverlay'))) {
        window.__sc27aOverlayClicks += 1;
      }
    }, true);
  });
  await clickProjectedLabel(page, 'Titin');
  expect(await page.evaluate(() => window.__sc27aOverlayClicks)).toBe(1);
  await expect(page.locator('#objectInspector')).toBeVisible();
  await expect(page.locator('#objectInspectorName')).not.toBeEmpty();
  await expect(page.locator('#objectInspectorLay')).not.toBeEmpty();
  await expect(page.locator('#objectInspectorEvidence .evidence-chip')).toHaveCount(1);
  await expect(page.locator('#objectInspectorEvidence .evidence-chip'))
    .toContainText('scientific class: strongly inferred');
  await page.locator('#objectInspectorDetailLink').click();
  await expect(page.locator('#tabEvidence')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#selectedEvidence')).toBeVisible();
  await expect(page.locator('#selectedEvidence .evidence-chip'))
    .toContainText('scientific class: strongly inferred');
  await page.locator('#selectedEvidenceSourcesLink').click();
  await expect(page.locator('#tabSources')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#bibliography')).not.toBeEmpty();
  await expect(page.locator('#modelFingerprint')).toHaveText(/^[a-f0-9]{64}$/);
});

test('SC27A mobile Research is one full-screen scroll sheet and leaves no stage target active', async ({ page }) => {
  const viewport = { width: 375, height: 812 };
  await openTour(page, viewport);
  await page.locator('#audienceEvidence').click();
  const panel = page.locator('#panel');
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.left === 0 && rect.top === 0
      && Math.abs(rect.width - innerWidth) <= 1 && Math.abs(rect.height - innerHeight) <= 1;
  })).toBe(true);
  await expect(page.locator('#canvas')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', 'hidden');
  await expect(page.locator('#inspectHint')).toHaveAttribute('data-overlay-layout', 'hidden');
  const scrollContainers = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && node.scrollHeight > node.clientHeight + 1
        && ['auto', 'scroll'].includes(style.overflowY);
    }).map((node) => node.id || node.tagName));
  expect(scrollContainers).toEqual(['panel']);

  for (const control of await panel.locator('button:visible, input:visible, a[href]:visible').all()) {
    if (await control.isDisabled()) continue;
    await control.focus();
    await assertInViewport(control, viewport);
    expect((await horizontalOverflow(page)).document).toBeLessThanOrEqual(1);
  }
  await page.locator('#closeEvidence').click();
  await expect(page.locator('#audienceEvidence')).toBeFocused();
  await expect(page.locator('#canvas')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', 'resolved');
  await expect(page.locator('#inspectHint')).toHaveAttribute('data-overlay-layout', 'resolved');
});

test('SC27A 200% browser-zoom layout equivalent preserves the Tour route', async ({ page }) => {
  const viewport = { width: 640, height: 360 };
  await openTour(page, viewport);
  expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').click();
  await page.locator('#chapterNext').scrollIntoViewIfNeeded();
  await assertInViewport(page.locator('#chapterNext'), viewport);
  await assertCentreUnobscured(page.locator('#chapterNext'));
  expect(await page.locator('#guidedCardBody')
    .evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  expect(await horizontalOverflow(page)).toEqual({ document: 0, body: 0, canvas: 0 });
});

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 720 }]) {
  test(`SC27A automated accessibility has no WCAG finding at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await setReducedMotion(page, true);
    await openTour(page, viewport);
    const scan = async (state) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations, state).toEqual([]);
    };
    await scan('cold open');
    await page.locator('#chapterNext').click();
    await expect(page.locator('#chapterProgress')).toHaveText('Beat 2 of 5');
    expect(await page.locator('#guidedCard').evaluate((node) => getComputedStyle(node).transitionDuration))
      .toMatch(/^(0s|0ms)(, (0s|0ms))*$/);
    await page.locator('#chapterNext').click();
    await scan('beat 3 mechanics');
    await page.locator('#chapterNext').click();
    await page.locator('#chapterNext').click();
    await scan('beat 5 evidence recap');
    await page.locator('#audienceEvidence').click();
    for (const [tab, panel, label] of [
      ['#tabInspect', '#panelInspect', 'Research Inspect'],
      ['#tabMeasure', '#panelMeasure', 'Research Measure'],
      ['#tabEvidence', '#panelEvidence', 'Research Evidence'],
      ['#tabSources', '#panelSources', 'Research Sources and build'],
    ]) {
      await page.locator(tab).click();
      await expect(page.locator(panel)).toBeVisible();
      await scan(label);
    }
  });
}
