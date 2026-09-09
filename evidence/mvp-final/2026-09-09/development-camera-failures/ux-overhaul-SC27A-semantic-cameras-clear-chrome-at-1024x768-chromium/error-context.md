# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-overhaul.spec.js >> SC27A semantic cameras clear chrome at 1024x768
- Location: test/browser/ux-overhaul.spec.js:545:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#scienceOverlay [data-full-sarcomere-locator]')
Expected: 1
Received: 0
Timeout:  8000ms

Call log:
  - Expect "toHaveCount" with timeout 8000ms
  - waiting for locator('#scienceOverlay [data-full-sarcomere-locator]')
    18 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- region "Interactive 3D titin and sarcomere model. Use the pointer to inspect a structure, or Left and Right Arrow to move through structures and Enter to pin an explanation." [ref=e3]:
  - img "Projected sarcomere landmarks, titin termini, and the stage scale bar" [ref=e4]:
    - button "Inspect Z-disc anchor (Z1-Z2 Ig + Z-repeats)" [ref=e7] [cursor=pointer]
    - generic [ref=e8] [cursor=pointer]: N · Z-disc anchor
    - button "Inspect M-line Ig region (M1-M10)" [ref=e11] [cursor=pointer]
    - generic [ref=e12] [cursor=pointer]: C · M-band anchor
    - generic [ref=e14]: 100 nm
    - generic [ref=e15]: titin line ≈2.3× reading width, not scale
  - generic:
    - generic:
      - generic [ref=e17]:
        - generic [ref=e18]: Titin across the sarcomere
        - generic [ref=e19]: Research preview · titin in muscle
      - generic [ref=e20]:
        - button "Open Research scope details" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: Scope details
          - generic [ref=e23]: Human TTN reference sequence · Q8WZ42-1
          - generic [ref=e24]: Reference geometry · 2,200 nm
        - button "Research" [ref=e25] [cursor=pointer]
    - region [ref=e26]:
      - generic [ref=e27]: Beat 5 of 5
      - paragraph [ref=e36]: What is measured, modeled, inferred, schematic, or not known?
      - heading "What do we know?" [level=1] [ref=e37]
      - generic [ref=e38]:
        - paragraph [ref=e39]: Titin’s spring, scaffold, and interaction/signaling roles rest on evidence labeled Measured, Modeled, Inferred, Schematic, or Not known.
        - group "Tour evidence labels" [ref=e40]:
          - generic [ref=e41]:
            - generic "Direct observation or deposited structure." [ref=e42]: Measured
            - generic [ref=e43]: Direct observation or deposited structure.
          - generic [ref=e44]:
            - generic "Declared model with source-bounded parameters." [ref=e45]: Modeled
            - generic [ref=e46]: Declared model with source-bounded parameters.
          - generic [ref=e47]:
            - generic "Converging evidence; not directly measured here." [ref=e48]: Inferred
            - generic [ref=e49]: Converging evidence; not directly measured here.
          - generic [ref=e50]:
            - generic "Drawn relationship; not measured geometry." [ref=e51]: Schematic
            - generic [ref=e52]: Drawn relationship; not measured geometry.
          - generic [ref=e53]:
            - generic "Evidence does not settle this feature." [ref=e54]: Not known
            - generic [ref=e55]: Evidence does not settle this feature.
        - status [ref=e56]: Returning to the complete titin route and evidence-language recap; your current sarcomere length is preserved.
        - button "Inspect titin’s evidence" [ref=e57] [cursor=pointer]:
          - text: Inspect titin’s evidence
          - generic [ref=e58]: →
        - generic [ref=e59]:
          - 'button "Previous: Scaffold the thick filament" [ref=e60] [cursor=pointer]': Previous
          - button "Replay the Tour" [active] [ref=e61] [cursor=pointer]: Replay
  - generic [ref=e62]:
    - text: "drag: orbit · wheel/pinch: zoom · right-drag: pan"
    - generic [ref=e63]: 1–5 beats · space stretch · x stretch beat · e Research · g Tour · r restart
```

# Test source

```ts
  97  |     const rect = node.getBoundingClientRect();
  98  |     const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  99  |     return hit === node || node.contains(hit) || hit?.contains(node);
  100 |   })).toBe(true);
  101 | }
  102 | 
  103 | async function assertContainedBy(child, parent) {
  104 |   const [inside, outside] = await Promise.all([child.boundingBox(), parent.boundingBox()]);
  105 |   expect(inside, 'contained element has a rendered box').not.toBeNull();
  106 |   expect(outside, 'containing element has a rendered box').not.toBeNull();
  107 |   expect(inside.x).toBeGreaterThanOrEqual(outside.x - 1);
  108 |   expect(inside.y).toBeGreaterThanOrEqual(outside.y - 1);
  109 |   expect(inside.x + inside.width).toBeLessThanOrEqual(outside.x + outside.width + 1);
  110 |   expect(inside.y + inside.height).toBeLessThanOrEqual(outside.y + outside.height + 1);
  111 | }
  112 | 
  113 | async function openTourState(page, viewport, beat, scene) {
  114 |   await page.setViewportSize(viewport);
  115 |   await setReducedMotion(page, true);
  116 |   await page.goto(`/#v=2&depth=learn&step=${beat}&sl=2200&drawer=closed&scene=${scene}&confidence=0`);
  117 |   await waitForReady(page);
  118 |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', 'resolved');
  119 |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-terminus-layout', 'resolved');
  120 |   await expect(page.locator('#inspectHint')).toHaveAttribute('data-overlay-layout', 'resolved');
  121 | }
  122 | 
  123 | async function openResearchState(page, viewport, beat, scene) {
  124 |   await page.setViewportSize(viewport);
  125 |   await setReducedMotion(page, true);
  126 |   await page.goto(`/#v=2&depth=explore&step=${beat}&sl=2200&drawer=inspect&scene=${scene}&confidence=1`);
  127 |   await waitForReady(page);
  128 |   await expect(page.locator('#canvas')).not.toHaveAttribute('inert');
  129 |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-label-layout', 'resolved');
  130 |   await expect(page.locator('#scienceOverlay')).toHaveAttribute('data-terminus-layout', 'resolved');
  131 |   await expect(page.locator('#inspectHint')).toHaveAttribute('data-overlay-layout', 'resolved');
  132 | }
  133 | 
  134 | /** Every painted overlay label family, using the same >3 px overprint rule as runtime. */
  135 | async function assertOverlayLabelsClear(page, viewport, stateLabel) {
  136 |   const audit = await page.evaluate((tolerance) => {
  137 |     const canvas = document.querySelector('#canvas').getBoundingClientRect();
  138 |     const overlay = document.querySelector('#scienceOverlay');
  139 |     const hint = document.querySelector('#inspectHint');
  140 |     const hintRect = hint.hidden ? null : hint.getBoundingClientRect();
  141 |     const labels = [...overlay.querySelectorAll('text')].flatMap((node) => {
  142 |       const rect = node.getBoundingClientRect();
  143 |       if (rect.width <= 0 || rect.height <= 0) return [];
  144 |       const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  145 |       return [{
  146 |         text: node.textContent.trim(),
  147 |         left: rect.left - canvas.left,
  148 |         right: rect.right - canvas.left,
  149 |         top: rect.top - canvas.top,
  150 |         bottom: rect.bottom - canvas.top,
  151 |         coveredByChrome: !hit || (!overlay.contains(hit) && hit.tagName !== 'CANVAS'),
  152 |       }];
  153 |     });
  154 |     const collisions = [];
  155 |     for (let i = 0; i < labels.length; i += 1) {
  156 |       for (let j = i + 1; j < labels.length; j += 1) {
  157 |         const a = labels[i];
  158 |         const b = labels[j];
  159 |         const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  160 |         const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  161 |         if (overlapX > tolerance && overlapY > tolerance) {
  162 |           collisions.push(`${a.text} ↔ ${b.text} (${overlapX.toFixed(1)}×${overlapY.toFixed(1)} px)`);
  163 |         }
  164 |       }
  165 |     }
  166 |     const hintCollisions = hintRect ? labels.filter((label) => (
  167 |       label.right > hintRect.left - canvas.left
  168 |       && label.left < hintRect.right - canvas.left
  169 |       && label.bottom > hintRect.top - canvas.top
  170 |       && label.top < hintRect.bottom - canvas.top
  171 |     )).map(({ text }) => text) : [];
  172 |     return {
  173 |       labels,
  174 |       collisions,
  175 |       hintCollisions,
  176 |       layout: overlay.dataset.labelLayout,
  177 |       hintLayout: hint.dataset.overlayLayout,
  178 |     };
  179 |   }, STAGE_LAYOUT.label_collision_tolerance_px);
  180 |   expect(audit.layout, `${stateLabel} runtime placement resolved`).toBe('resolved');
  181 |   expect(audit.hintLayout, `${stateLabel} inspection invitation placement resolved`).toBe('resolved');
  182 |   expect(audit.labels.length, `${stateLabel} paints scientific labels`).toBeGreaterThan(0);
  183 |   expect(audit.collisions, `${stateLabel} has no scientific-label overprint`).toEqual([]);
  184 |   expect(audit.hintCollisions, `${stateLabel} hint clears every scientific label`).toEqual([]);
  185 |   for (const label of audit.labels) {
  186 |     expect(label.left, `${stateLabel}: ${label.text} begins in viewport`).toBeGreaterThanOrEqual(-1);
  187 |     expect(label.right, `${stateLabel}: ${label.text} ends in viewport`)
  188 |       .toBeLessThanOrEqual(viewport.width + 1);
  189 |     expect(label.top, `${stateLabel}: ${label.text} begins in viewport`).toBeGreaterThanOrEqual(-1);
  190 |     expect(label.bottom, `${stateLabel}: ${label.text} ends in viewport`)
  191 |       .toBeLessThanOrEqual(viewport.height + 1);
  192 |     expect(label.coveredByChrome, `${stateLabel}: ${label.text} centre is unobscured`).toBe(false);
  193 |   }
  194 | }
  195 | 
  196 | async function assertSemanticCameraContract(page, viewport, beat) {
> 197 |   await expect(page.locator('#scienceOverlay [data-full-sarcomere-locator]')).toHaveCount(1);
      |                                                                               ^ Error: expect(locator).toHaveCount(expected) failed
  198 |   const audit = await page.evaluate(() => {
  199 |     const vis = window.titinVisualization;
  200 |     const canvasNode = document.querySelector('#canvas');
  201 |     const overlayNode = document.querySelector('#scienceOverlay');
  202 |     const canvas = canvasNode.getBoundingClientRect();
  203 |     const header = document.querySelector('#stageHeader').getBoundingClientRect();
  204 |     const story = document.querySelector('#guidedCard').getBoundingClientRect();
  205 |     const relativeBox = (node) => {
  206 |       const rect = node?.getBoundingClientRect();
  207 |       return rect ? {
  208 |         left: rect.left - canvas.left,
  209 |         right: rect.right - canvas.left,
  210 |         top: rect.top - canvas.top,
  211 |         bottom: rect.bottom - canvas.top,
  212 |         width: rect.width,
  213 |       } : null;
  214 |     };
  215 |     const ruleNode = document.querySelector('#scienceOverlay .locator-rule');
  216 |     const rule = relativeBox(ruleNode);
  217 |     const ruleCoordinates = [...ruleNode.getAttribute('d').matchAll(/-?[\d.]+/g)]
  218 |       .map((match) => Number(match[0]));
  219 |     const extentNode = document.querySelector('#scienceOverlay .locator-extent');
  220 |     const extent = relativeBox(extentNode);
  221 |     const transformedX = (node, x, y) => {
  222 |       const point = overlayNode.createSVGPoint();
  223 |       point.x = x; point.y = y;
  224 |       return point.matrixTransform(node.getScreenCTM()).x - canvas.left;
  225 |     };
  226 |     const extentX = Number(extentNode.getAttribute('x'));
  227 |     const extentY = Number(extentNode.getAttribute('y'));
  228 |     const extentWidth = Number(extentNode.getAttribute('width'));
  229 |     const locatorLabels = [...document.querySelectorAll('#scienceOverlay .science-label')]
  230 |       .filter((node) => {
  231 |         if (!rule) return false;
  232 |         const box = relativeBox(node);
  233 |         return box && box.top >= rule.top - 30 && box.bottom <= rule.bottom + 38;
  234 |       });
  235 |     const semanticLabels = [
  236 |       ...locatorLabels,
  237 |       ...document.querySelectorAll('#scienceOverlay .terminus-label'),
  238 |     ].map((node) => {
  239 |       const box = relativeBox(node);
  240 |       const hit = document.elementFromPoint(
  241 |         canvas.left + (box.left + box.right) / 2,
  242 |         canvas.top + (box.top + box.bottom) / 2,
  243 |       );
  244 |       const intersects = (obstacle) => (
  245 |         box.left < obstacle.right - canvas.left
  246 |         && box.right > obstacle.left - canvas.left
  247 |         && box.top < obstacle.bottom - canvas.top
  248 |         && box.bottom > obstacle.top - canvas.top
  249 |       );
  250 |       return {
  251 |         text: node.textContent.trim(),
  252 |         box,
  253 |         coveredByChrome: !hit || (!overlayNode.contains(hit) && hit.tagName !== 'CANVAS'),
  254 |         intersectsHeader: intersects(header),
  255 |         intersectsStory: intersects(story),
  256 |       };
  257 |     });
  258 |     const labelCollisions = [];
  259 |     for (let i = 0; i < semanticLabels.length; i += 1) {
  260 |       for (let j = i + 1; j < semanticLabels.length; j += 1) {
  261 |         const a = semanticLabels[i];
  262 |         const b = semanticLabels[j];
  263 |         if (a.box.left < b.box.right && a.box.right > b.box.left
  264 |             && a.box.top < b.box.bottom && a.box.bottom > b.box.top) {
  265 |           labelCollisions.push(`${a.text} ↔ ${b.text}`);
  266 |         }
  267 |       }
  268 |     }
  269 |     const termini = vis.projectPresentationAnchors(vis.showcaseOverlay().termini)
  270 |       .map((point) => {
  271 |         const hit = document.elementFromPoint(
  272 |           canvas.left + point.x_px, canvas.top + point.y_px,
  273 |         );
  274 |         return {
  275 |           ...point,
  276 |           coveredByChrome: !hit || (!overlayNode.contains(hit) && hit.tagName !== 'CANVAS'),
  277 |         };
  278 |       });
  279 |     const pathPoints = vis.titinPickPaths().paths.flatMap((path) => path.points)
  280 |       .map((point, index) => ({ id: `path:${index}`, ...point }));
  281 |     const reachablePathPoints = vis.projectPresentationAnchors(pathPoints)
  282 |       .filter((point) => {
  283 |         if (!point.visible) return false;
  284 |         const hit = document.elementFromPoint(
  285 |           canvas.left + point.x_px, canvas.top + point.y_px,
  286 |         );
  287 |         return hit && (hit.tagName === 'CANVAS' || overlayNode.contains(hit));
  288 |       }).length;
  289 |     return {
  290 |       canvas: { width: canvas.width, height: canvas.height },
  291 |       locatorTicks: document.querySelectorAll('#scienceOverlay .locator-tick').length,
  292 |       locatorAnchors: document.querySelectorAll('#scienceOverlay .locator-anchor').length,
  293 |       locatorLabels: locatorLabels.map((node) => node.textContent.trim()),
  294 |       rule,
  295 |       extent: extent && { ...extent, span: extentNode.dataset.visibleSpan },
  296 |       locatorMath: {
  297 |         ruleLeft: transformedX(ruleNode, ruleCoordinates[0], ruleCoordinates[1]),
```