# Not explicitly approved

Things that shipped without the owner explicitly saying yes: judgement calls
that could have gone the other way, and anything that went out untested. Walk
the list periodically and either bless or revert each item, then move it to a
"Settled" section rather than deleting it.

## Judgement calls that could have gone the other way

- **Its own repo, with copies of the characters.** Asked for as "puppy-stretch
  on GitHub, like puppy-run"; of the options offered, the owner picked copying
  `darla.js`, `mom.js`, `portrait-darla.js` and `bark.wav` in over building it
  from puppy-run. The copies are the committed puppy-run versions as of
  2026-10-21, so Miranda's newer brush/palette props (uncommitted in puppy-run
  at the time) aren't here — the timer never shows them anyway.
- **Dev port 7332**, one up from puppy-run's 7331. Picked, not asked.
- **`bark.wav` has no recorded source.** puppy-run's ATTRIBUTIONS.md covers
  every other audio file but not this one, and its history only says "newest
  commit". It's been public in puppy-run since July; copied here as-is.
- **The squat and the sit are my own poses, on joints the timer adds.** The
  game's rigs only hinge at the hip, which can only sit, so `src/main.js` adds
  a knee and an ankle to each of Miranda's legs and a hock to each of Darla's
  back legs at load (the models themselves are unchanged). Bottom of the
  squat: 0.5 rad lean, thighs 1.35 rad forward, shins 0.45 back, feet flat,
  arms out front, head lifted 0.35. Darla's sit: 0.45 rad pitch, front legs
  vertical, back legs folded forward under her (upper -0.8, lower -1.5) — the
  first try bent the hock backwards like a real dog's and looked broken. Both
  are re-grounded with their feet kept on the standing mark. They go down on the
  Start tap (asked for) and then swap on every bark.
- **They're turned to face each other** (Miranda 1.2 rad, Darla -0.6) in
  three-quarter profile, because straight on the squat didn't read. At the
  bottom of the squat Miranda's outstretched hands end up just short of
  Darla's nose, which I left.
- **`?pose=` (0–1) debug pin** that shows a pose with the start screen hidden
  and no timer, so a pose can be checked without it barking.
- **Timer extras nobody asked for:** a `?s=` override for the interval (5–600
  seconds, default 30), a 150 ms vibration with every bark, a pause/resume
  button, and the night look (purple sky, Miranda's night lips and lash
  flicks) between 7 pm and 7 am by the phone's clock.
- **The cue is Darla's bark alone** (the game's `bark.wav` at the game's 0.6
  gain). A synthesised bell came first; it was dropped when asked for "just
  bark". The bark at Start waits for the sample to load rather than being
  skipped.
- **Home-screen icon and app mode.** Asked for a real Darla icon for the home
  screen. Beyond that I picked: the peach page colour (#f7c4b4) as the icon
  background, the face at 66% of the icon width (inside the circle Android
  crops "maskable" icons to), and `display: standalone`, so the home-screen
  shortcut opens full screen without Chrome's address bar. Icons are drawn by
  `scripts/make-icons.mjs` from the same shapes as `portrait-darla.js` — if
  the portrait changes, rerun it.

- **The countdown adds to the hold** rather than eating into it: each round
  is 5 s to get into position (asked for: 3 s at first, then 5), then the
  bark, then a full 30 s (so a round is 35 s). Asked for: the countdown on
  Start and before every bark. Picked, not asked: a soft synthesised blip
  (880 Hz) and a 40 ms buzz on each number, the countdown numbers in the button colour, "Get ready"
  as the status line, and the poses now changing on the first bark instead of
  on the Start tap.

## Went out untested

- **The workout timer on a real phone.** Checked only in the desktop browser
  pane at phone size: start, the countdown, the pose change, pause and stop.
  The bark has been heard (through the PC's speakers). Never confirmed: that
  the vibration fires, that the wake lock actually keeps an Android screen on,
  or what happens after the phone is locked and unlocked mid-workout. The
  night look has never been seen.
- **Installing to a Pixel home screen.** The manifest and icons load, but the
  install itself, the icon as Android crops it, and standalone mode haven't
  been seen on the phone.
