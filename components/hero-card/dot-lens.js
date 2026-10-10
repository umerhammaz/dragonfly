export function initDotLens(canvas, container) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let running = false;

  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;
  let hasPointer = false;

  const STEP = 26;
  const RADIUS = 230;
  const RADIUS_SQ = RADIUS * RADIUS;
  const EXCLUSION_RADIUS = 14;

  let gridPoints = [];

  const buildGrid = () => {
    gridPoints = [];
    for (let x = STEP * 0.5; x < width; x += STEP) {
      for (let y = STEP * 0.5; y < height; y += STEP) {
        gridPoints.push({ x, y });
      }
    }
  };

  const start = () => {
    if (!running) {
      running = true;
      rafId = requestAnimationFrame(render);
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!hasPointer) {
      targetX = width * 0.5;
      targetY = height * 0.45;
      curX = targetX;
      curY = targetY;
    }

    buildGrid();
    start();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const onPointerMove = (e) => {
    const rect = container.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    hasPointer = true;
    start();
  };

  const onPointerLeave = () => {
    hasPointer = false;
    targetX = width * 0.5;
    targetY = height * 0.45;
    start();
  };

  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerleave", onPointerLeave);

  const render = () => {
    const dxTrack = targetX - curX;
    const dyTrack = targetY - curY;

    curX += dxTrack * 0.28;
    curY += dyTrack * 0.28;

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
        ctx.moveTo(pt.x + 1.1, pt.y);
        ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
        continue;
      }

      const dx = pt.x - curX;
      const dy = pt.y - curY;
      const d2 = dx * dx + dy * dy;

      if (d2 >= RADIUS_SQ) {
        ctx.moveTo(pt.x + 1.1, pt.y);
        ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
        continue;
      }

      const d = Math.sqrt(d2);
      const pull = Math.exp(-d2 / (2 * 72 * 72)) * 0.82;
      const px = curX + dx * (1 - pull);
      const py = curY + dy * (1 - pull);

      if (Math.hypot(px - curX, py - curY) < EXCLUSION_RADIUS) continue;

      const proximity = 1 - d / RADIUS;
      perturbed.push({
        x: px,
        y: py,
        size: 1.1 + proximity * 1.5,
        alpha: 0.08 + proximity * 0.72
      });
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fill();

    for (let i = 0; i < perturbed.length; i++) {
      const p = perturbed[i];
      ctx.fillStyle = `rgba(0, 0, 0, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(curX, curY, EXCLUSION_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(curX, curY, 7, 0, Math.PI * 2);
    ctx.fill();

    if (Math.abs(dxTrack) < 0.1 && Math.abs(dyTrack) < 0.1) {
      running = false;
      return;
    }

    rafId = requestAnimationFrame(render);
  };

  resize();

  return () => {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerleave", onPointerLeave);
  };
}