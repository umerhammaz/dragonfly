const BASE_RADIUS = 7;
const BREATH_FREQ = 0.0066;
const BREATH_AMP = 0.5;
const REST_X_RATIO = 0.5;
const REST_Y_RATIO = 0.45;
const MAX_DT_S = 0.05;
const SCALE_LAMBDA = 18;
const PRESS_SCALE = 0.82;
const POS_EPSILON = 0.05;
const SCALE_EPSILON = 0.001;

const SEMANTIC_SELECTOR =
  "[data-cursor], iframe, [disabled], [aria-disabled='true'], input, textarea, [contenteditable='true'], .nav-dialer, a, button, [role='button']";

const NON_TEXT_INPUTS = new Set([
  "button",
  "submit",
  "reset",
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image"
]);

const STATE_SCALES = {
  default: { sx: 1, sy: 1, hidden: false, muted: false, solid: false },
  interactive: { sx: 1.45, sy: 1.45, hidden: false, muted: false, solid: false },
  dial: { sx: 0.65, sy: 1.85, hidden: false, muted: false, solid: false },
  text: { sx: 1, sy: 1, hidden: true, muted: false, solid: false },
  disabled: { sx: 0.85, sy: 0.85, hidden: false, muted: true, solid: false },
  none: { sx: 1, sy: 1, hidden: true, muted: false, solid: false },
  solid: { sx: 1, sy: 1, hidden: false, muted: false, solid: true }
};

function resolveMode(target) {
  if (!(target instanceof Element)) return "default";
  const el = target.closest(SEMANTIC_SELECTOR);
  if (!el) return "default";

  const explicit = el.getAttribute("data-cursor");
  if (explicit && Object.hasOwn(STATE_SCALES, explicit)) return explicit;

  if (el.tagName === "IFRAME") return "none";
  if (el.disabled || el.getAttribute("aria-disabled") === "true") return "disabled";
  if (el.tagName === "TEXTAREA" || el.isContentEditable) return "text";
  if (el.tagName === "INPUT") {
    return NON_TEXT_INPUTS.has(el.type) ? "interactive" : "text";
  }
  if (el.classList.contains("nav-dialer")) return "dial";
  if (el.matches("a, button, [role='button']")) return "interactive";

  return "default";
}

export function initCursor(container, cursorEl, scrollTarget = null) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = { x: 0, y: 0, breath: 0, active: false };

  let rectDirty = true;
  let rectLeft = 0;
  let rectTop = 0;
  let width = 0;
  let height = 0;

  let rawClientX = 0;
  let rawClientY = 0;
  let hasPointer = false;
  let isPressed = false;
  let needsResync = false;
  let lastTarget = null;
  let mode = "default";

  let prevNow = 0;
  let curSx = 1;
  let curSy = 1;
  let hasPainted = false;
  let paintedX = 0;
  let paintedY = 0;
  let paintedSx = 1;
  let paintedSy = 1;

  const isTrackedPointer = (e) => e.pointerType !== "touch";

  const invalidateRect = () => {
    rectDirty = true;
  };

  const syncRect = () => {
    const rect = container.getBoundingClientRect();
    rectLeft = rect.left;
    rectTop = rect.top;
    width = rect.width;
    height = rect.height;
    rectDirty = false;
  };

  const setMode = (nextMode) => {
    if (nextMode === mode) return;
    mode = nextMode;
    const preset = STATE_SCALES[mode];
    cursorEl.classList.toggle("is-hidden", preset.hidden);
    cursorEl.classList.toggle("is-muted", preset.muted);
    cursorEl.classList.toggle("is-solid", preset.solid);
  };

  const reset = () => {
    hasPointer = false;
    isPressed = false;
    needsResync = false;
    lastTarget = null;
    state.active = false;
    setMode("default");
  };

  const refresh = () => {
    needsResync = true;
  };

  const resetClock = () => {
    prevNow = 0;
  };

  const onPointerMove = (e) => {
    if (!isTrackedPointer(e)) return;
    if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
    rawClientX = e.clientX;
    rawClientY = e.clientY;
    hasPointer = true;
    state.active = true;
  };

  const onPointerOver = (e) => {
    if (!isTrackedPointer(e) || e.target === lastTarget) return;
    lastTarget = e.target;
    setMode(resolveMode(e.target));
  };

  const onPointerDown = (e) => {
    if (!isTrackedPointer(e)) return;
    isPressed = true;
  };

  const onPointerUp = (e) => {
    if (!isTrackedPointer(e)) return;
    isPressed = false;
  };

  const onStageScroll = () => {
    if (hasPointer) needsResync = true;
  };

  const step = (now) => {
    if (rectDirty) syncRect();

    const dt = prevNow === 0 ? 0 : Math.min(Math.max((now - prevNow) * 0.001, 0), MAX_DT_S);
    prevNow = now;

    if (needsResync) {
      needsResync = false;
      if (hasPointer) {
        const hit = document.elementFromPoint(rawClientX, rawClientY);
        const target = hit && container.contains(hit) ? hit : null;
        lastTarget = target;
        setMode(resolveMode(target));
      } else {
        lastTarget = null;
        setMode("default");
      }
    }

    const breath = reducedMotion.matches ? 0 : Math.sin(now * BREATH_FREQ);
    state.breath = breath;

    if (hasPointer) {
      state.x = rawClientX - rectLeft;
      state.y = rawClientY - rectTop;
    } else {
      state.x = width * REST_X_RATIO;
      state.y = height * REST_Y_RATIO;
    }

    const preset = STATE_SCALES[mode];
    const pressMul = isPressed && !preset.muted ? PRESS_SCALE : 1;
    const targetSx = preset.sx * pressMul;
    const targetSy = preset.sy * pressMul;

    if (reducedMotion.matches || dt === 0) {
      curSx = targetSx;
      curSy = targetSy;
    } else {
      const alpha = 1 - Math.exp(-SCALE_LAMBDA * dt);
      curSx += (targetSx - curSx) * alpha;
      curSy += (targetSy - curSy) * alpha;
    }

    const breathScale = (BASE_RADIUS + breath * BREATH_AMP) / BASE_RADIUS;
    const finalSx = curSx * breathScale;
    const finalSy = curSy * breathScale;

    if (
      !hasPainted ||
      Math.abs(state.x - paintedX) > POS_EPSILON ||
      Math.abs(state.y - paintedY) > POS_EPSILON ||
      Math.abs(finalSx - paintedSx) > SCALE_EPSILON ||
      Math.abs(finalSy - paintedSy) > SCALE_EPSILON
    ) {
      hasPainted = true;
      paintedX = state.x;
      paintedY = state.y;
      paintedSx = finalSx;
      paintedSy = finalSy;
      cursorEl.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) scale(${finalSx.toFixed(4)}, ${finalSy.toFixed(4)})`;
    }
  };

  const resizeObserver = new ResizeObserver(invalidateRect);
  resizeObserver.observe(container);

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerover", onPointerOver, { passive: true });
  container.addEventListener("pointerdown", onPointerDown, { passive: true });
  container.addEventListener("pointerleave", reset, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", reset, { passive: true });
  window.addEventListener("blur", reset);
  window.addEventListener("resize", invalidateRect, { passive: true });
  window.visualViewport?.addEventListener("resize", invalidateRect, { passive: true });
  window.visualViewport?.addEventListener("scroll", invalidateRect, { passive: true });
  scrollTarget?.addEventListener("scroll", onStageScroll, { passive: true });

  syncRect();

  return {
    state,
    step,
    refresh,
    reset,
    resetClock,
    destroy: () => {
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerover", onPointerOver);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerleave", reset);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", invalidateRect);
      window.visualViewport?.removeEventListener("resize", invalidateRect);
      window.visualViewport?.removeEventListener("scroll", invalidateRect);
      scrollTarget?.removeEventListener("scroll", onStageScroll);
    }
  };
}