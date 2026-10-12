// Strokes for the tests: lists of screen points [x, y], one move each. Shared by the end-to-end tests (e2e/garden.js), the gesture
// tracker's unit tests and make-gesture-vectors.js. The noisy ones are seeded, so they're the same on every run
export const line = (x0, y0, x1, y1, n) =>
  Array.from({ length: n + 1 }, (_, k) => [x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
export function zigzag(x0, y0, corners, w, h, steps) {
  const p = [[x0, y0]];
  for (let c = 0; c <= corners; c++) {
    const [x, y] = p[p.length - 1];
    p.push(...line(x, y, x + w, y + (c % 2 ? h : -h), steps).slice(1));
  }
  return p;
}
export const wave = (x0, y0, len, amp, wl, step) =>
  Array.from({ length: Math.round(len / step) }, (_, k) => [
    x0 + k * step,
    y0 + amp * Math.sin(((k * step) / wl) * 2 * Math.PI),
  ]);
export const arc = (cx, cy, r, a0, a1, n) =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = a0 + ((a1 - a0) * k) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
// a circle of `turns`, starting at the angle `from`, squashed to an oval `squash` as high as it's wide
export const circle = (cx, cy, r, turns, n, { from = 0, squash = 1 } = {}) =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = from + (k / n) * turns * 2 * Math.PI;
    return [cx + r * Math.cos(a), cy + r * squash * Math.sin(a)];
  });

// seeded noise, 0..1
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// a small trembling movement: a finger wobbling round a spot a few px across, with seeded noise
export function tremble(cx, cy, r, turns, n, seed) {
  const rnd = rng(seed);
  return circle(cx, cy, r, turns, n).map(([x, y]) => [x + (rnd() - 0.5) * r * 0.5, y + (rnd() - 0.5) * r * 0.5]);
}
// jitter, as the circle fix sees it. Today's circle check turned almost all of these into towers:
// - rubbing: to and fro along a line that drifts a little, amp px each way, `per` moves for each stroke across
export function rub(cx, cy, amp, n, per, seed) {
  const rnd = rng(seed);
  const p = [];
  let a = rnd() * 2 * Math.PI;
  for (let k = 0; k <= n; k++) {
    a += (rnd() - 0.5) * 0.3;
    const u = Math.sin((k / per) * Math.PI) * amp * (0.7 + 0.3 * rnd());
    const v = (rnd() - 0.5) * amp * 0.3;
    p.push([cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)]);
  }
  return p;
}
// - shaking: each move a random step of up to `step` px, pulled back towards the spot, so it stays within about amp px of it
export function shake(cx, cy, amp, n, step, seed) {
  const rnd = rng(seed);
  const p = [[cx, cy]];
  let x = cx;
  let y = cy;
  for (let k = 0; k < n; k++) {
    const a = rnd() * 2 * Math.PI;
    const s = step * rnd();
    x += Math.cos(a) * s - (((x - cx) * step) / amp) * 0.5;
    y += Math.sin(a) * s - (((y - cy) * step) / amp) * 0.5;
    p.push([x, y]);
  }
  return p;
}
// - scribbling: wandering in a patch w px across, steering a little and now and then turning back, up to `step` px a move
export function scribble(cx, cy, w, n, step, seed) {
  const rnd = rng(seed);
  const p = [[cx, cy]];
  let x = cx;
  let y = cy;
  let a = rnd() * 2 * Math.PI;
  for (let k = 0; k < n; k++) {
    if (rnd() < 0.25) {
      a += Math.PI * (0.6 + 0.8 * rnd()) * (rnd() < 0.5 ? 1 : -1);
    } else {
      a += (rnd() - 0.5) * 0.8;
    }
    x += Math.cos(a) * step * (0.4 + 0.6 * rnd());
    y += Math.sin(a) * step * (0.4 + 0.6 * rnd());
    if (Math.abs(x - cx) > w / 2) {
      a = Math.PI - a;
      x = cx + (Math.sign(x - cx) * w) / 2;
    }
    if (Math.abs(y - cy) > w / 2) {
      a = -a;
      y = cy + (Math.sign(y - cy) * w) / 2;
    }
    p.push([x, y]);
  }
  return p;
}
