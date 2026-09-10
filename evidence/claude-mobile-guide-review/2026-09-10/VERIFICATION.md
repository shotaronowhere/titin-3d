# Independent browser checks by Codex

These observations were made while Claude reviewed the source and screenshots; they are not attributed to Claude. No application source was modified during review.

## Manual viewing angle is lost on guide disclosure

Reproduced in Chromium at 1280×720 with reduced motion. Enter Stretch, orbit by dragging from (950,310) to (1040,350), wait for the camera to settle, then click Hide guide and wait again. The app announces “Camera adjusted manually. Scene is now Custom.” after orbiting. Toggling the guide then resets the camera direction, rather than only changing the space allocated to the model.

The fixed 0–1200 nm reference axis projects with a slope of about -0.335 after the orbit and +0.016 after disclosure. Raw projected reference coordinates are saved in manual-camera-check.json. Reference points are for comparing camera transforms; their visibility is not a claim that the current molecular geometry is clipped.

The disclosure handler unconditionally calls applyCameraPreset in src/index.template.html. The viewport handler also sets audienceReframePending to true unconditionally; the resize variant is inferred from source, not separately reproduced here.

## Landscape controls remain below the fold

Reproduced at 844×390 with touch enabled. Enter Stretch with the keyboard and scroll to the top. The page has a 680 px document height; the slider starts at y=454, playback at y=512, and Next at y=593. The guide is collapsed. See landscape-check.json and landscape-844x390.png.

The fixed 680 px short-viewport layout predates this patch. This is an unresolved limitation relevant to the requested mobile UX, not a newly introduced regression. The new collapsed mobile controls styling does not match a landscape viewport wider than 767 px.
