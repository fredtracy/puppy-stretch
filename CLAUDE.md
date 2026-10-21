# puppy-stretch

A workout timer with Darla and Miranda: tap Start, and every 30 seconds
Darla barks and the two of them switch between standing and down (Miranda
squats, Darla sits). Spun off from puppy-run (`../puppy-run`).

## Shared code is copied, not linked
`src/darla.js`, `src/mom.js`, `src/portrait-darla.js` and
`public/audio/bark.wav` are copies from puppy-run, taken on 2026-10-21. Changes
to the characters in the game do not carry over here on their own — re-copy
them if the timer should pick them up.

## Workflow
Same as puppy-run:
- Run the build (`npm run build`) right before committing and always before
  pushing, never on the assumption an earlier build still holds.
- Commit straight to `main`. No feature branches.
- Log anything the owner didn't explicitly approve in `notes/unreviewed.md`.
- Every push to `main` deploys to GitHub Pages via
  `.github/workflows/deploy.yml`. That's the point; it doesn't need
  confirming each time.
- Dev server is pinned to port 7332 (puppy-run is 7331):
  **http://localhost:7332/puppy-stretch/**. `?s=5` shortens the interval,
  `?pose=1` shows the down pose without starting the timer.
