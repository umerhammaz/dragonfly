const STEP = 26;
const RADIUS = 230;
const RADIUS_SQ = RADIUS * RADIUS;
const PULL_SIGMA_SQ_2 = 2 * 72 * 72;
const INNER_CUTOFF = 9;
const FADE_END = 24;
const FADE_SPAN = FADE_END - INNER_CUTOFF;
const BASE_DOT_RADIUS = 1.1;

export function initDotLens(canvas, container) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let gridPoints = [];
  let dotColor = "0, 0, 0";

  const buildGrid = () => {
    gridPoints = [];
    for (let x = STEP * 0.5; x < width; x += STEP) {
      for (let y = STEP * 0.5; y < height; y += STEP) {
        gridPoints.push({ x, y });
      }
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dotColor = getComputedStyle(container).getPropertyValue("--dot-color").trim() || "0, 0, 0";
    buildGrid();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const render = (pointer) => {
    const curX = pointer.x;
    const curY = pointer.y;
    const breath = pointer.breath;
    const pullFactor = 0.82 + breath * 0.05;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();

    const perturbed = [];
    const leftBound = curX - RADIUS;
    const rightBound = curX + RADIUS;
    const topBound = curY - RADIUS;
    const bottomBound = curY + RADIUS;

    for (let i = 0; i < gridPoints.length; i++) {
      const pt = gridPoints[i];
      if (pt.x < leftBound || pt.x > rightBound || pt.y < topBound || pt.y > bottomBound) {
        ctx.moveTo(pt.x + BASE_DOT_RADIUS, pt.y);
        ctx.arc(pt.x, pt.y, BASE_DOT_RADIUS, 0, Math.PI * 2);
        continue;
      }

      const dx = pt.x - curX;
      const dy = pt.y - curY;
      const d2 = dx * dx + dy * dy;

      if (d2 >= RADIUS_SQ) {
        ctx.moveTo(pt.x + BASE_DOT_RADIUS, pt.y);
        ctx.arc(pt.x, pt.y, BASE_DOT_RADIUS, 0, Math.PI * 2);
        continue;
      }

      const d = Math.sqrt(d2);
      const pull = Math.exp(-d2 / PULL_SIGMA_SQ_2) * pullFactor;
      const px = curX + dx * (1 - pull);
      const py = curY + dy * (1 - pull);

      const distToCenter = Math.hypot(px - curX, py - curY);
      if (distToCenter <= INNER_CUTOFF) continue;

      const fade = distToCenter < FADE_END ? (distToCenter - INNER_CUTOFF) / FADE_SPAN : 1;
      const proximity = 1 - d / RADIUS;

      perturbed.push({
        x: px,
        y: py,
        size: (BASE_DOT_RADIUS + proximity * 1.5 + proximity * breath * 0.25) * fade,
        alpha: (0.08 + proximity * 0.72 + proximity * breath * 0.08) * fade
      });
    }

    ctx.fillStyle = `rgba(${dotColor}, 0.08)`;
    ctx.fill();

    for (let i = 0; i < perturbed.length; i++) {
      const p = perturbed[i];
      ctx.fillStyle = `rgba(${dotColor}, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return {
    render,
    destroy: () => {
      resizeObserver.disconnect();
    }
  };
}