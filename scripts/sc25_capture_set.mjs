/**
 * The SC-25 evidence screenshots: what is captured, at what size, of what state.
 *
 * Its own module because two commands need it and neither should run the other:
 * `capture_sc25_evidence.mjs` produces the images with a browser, and
 * `build_sc25_evidence.mjs` records and verifies their digests without one.
 * Sharing a constant through a script that does work on import is how a gate ends
 * up rewriting the artifact it was meant to check.
 */
export const SC25_CAPTURES = Object.freeze([
  ['cold-open-1280x720.png', 1280, 720, '', 'the first rendered frame identifies titin by '
    + 'label and colour and exposes the primary action'],
  ['cold-open-375x812.png', 375, 812, '', 'the same first frame at phone width'],
  ['route-recap-1280x720.png', 1280, 720,
    '#v=2&depth=learn&step=knowledge_recap&sl=2200&drawer=closed&scene=overview&confidence=0',
    'chapter 7: the continuous Z-disc-to-M-line route is not a hairline'],
  ['a-band-scaffold-1280x720.png', 1280, 720,
    '#v=2&depth=learn&step=scaffold_thick_filament&sl=2200&drawer=closed'
    + '&scene=a_band_scaffold&confidence=0',
    'chapter 6: the A-band route with its lattice context'],
  ['pinned-titin-1280x720.png', 1280, 720, '',
    'a pinned explanation clear of the header and the primary controls'],
]);
