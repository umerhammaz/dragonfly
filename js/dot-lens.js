const STEP = 26;
const RADIUS = 230;
const RADIUS_SQ = RADIUS * RADIUS;
const CURSOR_BASE_RADIUS = 7;
const CURSOR_BREATH_AMP = 0.5;
const CURSOR_HOVER_SCALE = 1.45;
const CURSOR_LERP = 0.2;
const INTERACTIVE_SELECTOR = "a, button, [role='button'], .nav-dialer";
const TEXT_INPUT_SELECTOR = "input, textarea, [contenteditable='true']";

export function initDotLens(canvas, container, cursorEl = null) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let running = false;
  let containerRect = null;

  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;
  let hasPointer = false;
  let hoverScale = 1;
  let targetHoverScale = 1;

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

  const syncRect = () => {
    containerRect = container.getBoundingClientRect();
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    syncRect();

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
  window.addEventListener("resize", syncRect);

  const onPointerMove = (e) => {
    if (!containerRect) syncRect();
    targetX = e.clientX - containerRect.left;
    targetY = e.clientY - containerRect.top;
    hasPointer = true;

    if (cursorEl && e.target instanceof Element) {
      const isText = Boolean(e.target.closest(TEXT_INPUT_SELECTOR));
      cursorEl.classList.toggle("is-hidden", isText);
      targetHoverScale = !isText && e.target.closest(INTERACTIVE_SELECTOR) ? CURSOR_HOVER_SCALE : 1;
    }

    start();
  };

  const onPointerLeave = () => {
    hasPointer = false;
    targetX = width * 0.5;
    targetY = height * 0.45;
    targetHoverScale = 1;
    if (cursorEl) cursorEl.classList.remove("is-hidden");
    start();
  };

  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerleave", onPointerLeave);

  const render = () => {
    curX = targetX;
    curY = targetY;

    const time = performance.now() * 0.0066;
    const breath = Math.sin(time);
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
      const pull = Math.exp(-d2 / (2 * 72 * 72)) * pullFactor;
      const px = curX + dx * (1 - pull);
      const py = curY + dy * (1 - pull);

      const distToCenter = Math.hypot(px - curX, py - curY);
      if (distToCenter <= 9) continue;

      let fade = 1;
      if (distToCenter < 24) {
        fade = (distToCenter - 9) / 15;
      }

      const proximity = 1 - d / RADIUS;
      perturbed.push({
        x: px,
        y: py,
        size: (1.1 + proximity * 1.5 + proximity * breath * 0.25) * fade,
        alpha: (0.08 + proximity * 0.72 + proximity * breath * 0.08) * fade
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


    if (cursorEl) {
      hoverScale += (targetHoverScale - hoverScale) * CURSOR_LERP;
      const breathScale = (CURSOR_BASE_RADIUS + breath * CURSOR_BREATH_AMP) / CURSOR_BASE_RADIUS;
      cursorEl.style.transform = `translate3d(${curX}px, ${curY}px, 0) scale(${breathScale * hoverScale})`;
    } else {
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(curX, curY, CURSOR_BASE_RADIUS + breath * CURSOR_BREATH_AMP, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(render);
  };

  resize();

  return () => {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    window.removeEventListener("resize", syncRect);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerleave", onPointerLeave);
  };
}