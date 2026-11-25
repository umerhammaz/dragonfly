export const CURSOR_NUDGE_EVENT = "cursor:nudge";

const BREATH_FREQ = 0.0066;
const RING_RADIUS = 16;
const RING_BREATH_AMP = 1;
const REST_X_RATIO = 0.5;
const REST_Y_RATIO = 0.45;
const MAX_DT_S = 0.05;
const SCALE_LAMBDA = 20;
const RING_POS_LAMBDA = 24;
const NUDGE_DECAY_LAMBDA = 16;
const NUDGE_OFFSET_PX = 4;
const CORE_NUDGE_RATIO = 0.45;
const CORE_PRESS_SCALE = 0.85;
const RING_PRESS_SCALE = 0.78;
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

const STATE_MODES = {
  default: { core: 1, hidden: false, muted: false, solid: false },
  interactive: { core: 1.2, hidden: false, muted: false, solid: false },
  dial: { core: 0.95, hidden: false, muted: false, solid: false },
  text: { core: 1, hidden: true, muted: false, solid: false },
  disabled: { core: 0.85, hidden: false, muted: true, solid: false },
  none: { core: 1, hidden: true, muted: false, solid: false },
  solid: { core: 1, hidden: false, muted: false, solid: true }
};

function resolveMode(target) {
  if (!(target instanceof Element)) return "default";
  const el = target.closest(SEMANTIC_SELECTOR);
  if (!el) return "default";

  const explicit = el.getAttribute("data-cursor");
  if (explicit && Object.hasOwn(STATE_MODES, explicit)) return explicit;

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

function resolveSolid(target, mode) {
  if (STATE_MODES[mode].solid) return true;
  return target instanceof Element && Boolean(target.closest("[data-cursor-solid]"));
}

export function initCursor(container, cursorEl, scrollTarget = null) {
  const coreEl = cursorEl.querySelector(".app-cursor__core");
  const ringEl = cursorEl.querySelector(".app-cursor__ring");
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
  let isSolid = false;

  let prevNow = 0;
  let ringX = 0;
  let ringY = 0;
  let nudgeY = 0;
  let curCoreScale = 1;
  let curRingScale = 1;

  let hasPainted = false;
  let paintedX = 0;
  let paintedY = 0;
  let paintedCoreScale = 1;
  let paintedRingDx = 0;
  let paintedRingDy = 0;
  let paintedRingScale = 1;

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

  const setAppearance = (nextMode, nextSolid) => {
    if (nextMode !== mode) {
      mode = nextMode;
      const preset = STATE_MODES[mode];
      cursorEl.dataset.mode = mode;
      cursorEl.classList.toggle("is-hidden", preset.hidden);
      cursorEl.classList.toggle("is-muted", preset.muted);
    }
    if (nextSolid !== isSolid) {
      isSolid = nextSolid;
      cursorEl.classList.toggle("is-solid", isSolid);
    }
  };

  const syncTarget = (target) => {
    lastTarget = target;
    const nextMode = resolveMode(target);
    setAppearance(nextMode, resolveSolid(target, nextMode));
  };

  const reset = () => {
    hasPointer = false;
    isPressed = false;
    needsResync = false;
    lastTarget = null;
    nudgeY = 0;
    state.active = false;
    cursorEl.classList.add("is-idle");
    setAppearance("default", false);
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
    const wasIdle = !hasPointer;
    rawClientX = e.clientX;
    rawClientY = e.clientY;
    hasPointer = true;
    state.active = true;

    if (wasIdle) {
      if (rectDirty) syncRect();
      ringX = rawClientX - rectLeft;
      ringY = rawClientY - rectTop;
      needsResync = true;
      cursorEl.classList.remove("is-idle");
    }
  };

  const onPointerOver = (e) => {
    if (!isTrackedPointer(e) || e.target === lastTarget) return;
    syncTarget(e.target);
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

  const onNudge = (e) => {
    if (!hasPointer || reducedMotion.matches) return;
    const dir = Number(e.detail);
    if (!Number.isFinite(dir) || dir === 0) return;
    nudgeY = Math.sign(dir) * NUDGE_OFFSET_PX;
  };

  const step = (now) => {
    if (rectDirty) syncRect();

    const dt = prevNow === 0 ? 0 : Math.min(Math.max((now - prevNow) * 0.001, 0), MAX_DT_S);
    prevNow = now;

    if (needsResync) {
      needsResync = false;
      if (hasPointer) {
        const hit = document.elementFromPoint(rawClientX, rawClientY);
        syncTarget(hit && container.contains(hit) ? hit : null);
      } else {
        syncTarget(null);
      }
    }

    const breath = reducedMotion.matches ? 0 : Math.sin(now * BREATH_FREQ);
    state.breath = breath;

    if (!hasPointer) {
      state.x = width * REST_X_RATIO;
      state.y = height * REST_Y_RATIO;
      return;
    }

    state.x = rawClientX - rectLeft;
    state.y = rawClientY - rectTop;

    const preset = STATE_MODES[mode];
    const activePress = isPressed && !preset.muted;
    const targetCoreScale = preset.core * (activePress ? CORE_PRESS_SCALE : 1);
    const targetRingScale = activePress ? RING_PRESS_SCALE : 1;

    if (reducedMotion.matches || dt === 0) {
      curCoreScale = targetCoreScale;
      curRingScale = targetRingScale;
      ringX = state.x;
      ringY = state.y;
      nudgeY = 0;
    } else {
      const scaleAlpha = 1 - Math.exp(-SCALE_LAMBDA * dt);
      const posAlpha = 1 - Math.exp(-RING_POS_LAMBDA * dt);
      curCoreScale += (targetCoreScale - curCoreScale) * scaleAlpha;
      curRingScale += (targetRingScale - curRingScale) * scaleAlpha;
      ringX += (state.x - ringX) * posAlpha;
      ringY += (state.y - ringY) * posAlpha;
      nudgeY *= Math.exp(-NUDGE_DECAY_LAMBDA * dt);
      if (Math.abs(nudgeY) < POS_EPSILON) nudgeY = 0;
    }

    const coreX = state.x;
    const coreY = state.y + nudgeY * CORE_NUDGE_RATIO;
    const ringDx = ringX - coreX;
    const ringDy = ringY + nudgeY - coreY;
    const breathScale = (RING_RADIUS + breath * RING_BREATH_AMP) / RING_RADIUS;
    const finalRingScale = curRingScale * breathScale;

    if (
      !hasPainted ||
      Math.abs(coreX - paintedX) > POS_EPSILON ||
      Math.abs(coreY - paintedY) > POS_EPSILON
    ) {
      paintedX = coreX;
      paintedY = coreY;
      cursorEl.style.transform = `translate3d(${coreX.toFixed(2)}px, ${coreY.toFixed(2)}px, 0)`;
    }

    if (coreEl && (!hasPainted || Math.abs(curCoreScale - paintedCoreScale) > SCALE_EPSILON)) {
      paintedCoreScale = curCoreScale;
      coreEl.style.transform = `scale(${curCoreScale.toFixed(4)})`;
    }

    if (
      ringEl &&
      (!hasPainted ||
        Math.abs(ringDx - paintedRingDx) > POS_EPSILON ||
        Math.abs(ringDy - paintedRingDy) > POS_EPSILON ||
        Math.abs(finalRingScale - paintedRingScale) > SCALE_EPSILON)
    ) {
      paintedRingDx = ringDx;
      paintedRingDy = ringDy;
      paintedRingScale = finalRingScale;
      ringEl.style.transform = `translate3d(${ringDx.toFixed(2)}px, ${ringDy.toFixed(2)}px, 0) translate(-50%, -50%) scale(${finalRingScale.toFixed(4)})`;
    }

    hasPainted = true;
  };

  const resizeObserver = new ResizeObserver(invalidateRect);
  resizeObserver.observe(container);

  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerover", onPointerOver, { passive: true });
  container.addEventListener("pointerdown", onPointerDown, { passive: true });
  container.addEventListener("pointerleave", reset, { passive: true });
  container.addEventListener(CURSOR_NUDGE_EVENT, onNudge);
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", reset, { passive: true });
  window.addEventListener("blur", reset);
  window.addEventListener("resize", invalidateRect, { passive: true });
  window.visualViewport?.addEventListener("resize", invalidateRect, { passive: true });
  window.visualViewport?.addEventListener("scroll", invalidateRect, { passive: true });
  scrollTarget?.addEventListener("scroll", onStageScroll, { passive: true });

  cursorEl.dataset.mode = mode;
  cursorEl.classList.add("is-idle");
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
      container.removeEventListener(CURSOR_NUDGE_EVENT, onNudge);
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