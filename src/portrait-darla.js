// Darla's hand-drawn face, used here as the tab icon. Copied from puppy-run,
// where the same drawing is the character-select portrait and the favicon.
// A plain canvas drawing in her own palette (copied from darla.js) rather
// than a 3D snapshot, since it reads more clearly at icon size and costs
// nothing at startup.
export function drawDarlaPortrait(ctx, size) {
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(c, c);

  // Floppy ears
  ctx.fillStyle = '#a9855c';
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(side * c * 0.62, -c * 0.1, c * 0.22, c * 0.42, side * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });

  // Head
  ctx.fillStyle = '#c4a074';
  ctx.beginPath();
  ctx.arc(0, 0, c * 0.72, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle
  ctx.fillStyle = '#f1e8d9';
  ctx.beginPath();
  ctx.ellipse(0, c * 0.32, c * 0.36, c * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#1c1712';
  ctx.beginPath();
  ctx.ellipse(0, c * 0.22, c * 0.09, c * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(side * c * 0.26, -c * 0.06, c * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}
