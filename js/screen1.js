const FALLBACK_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / FALLBACK_FPS;
const END_EPSILON = 0.05;
const REVERSE_SRC = "./assests/screen1-reverse.mp4";

export function mount(stage) {
  const forward = stage.querySelector('[data-role="forward"]');
  const stageEl = stage.querySelector(".hero-video-stage");
  if (!forward || !stageEl) return;

  const reverse = document.createElement("video");
  reverse.className = "hero-video is-hidden";
  reverse.muted = true;
  reverse.playsInline = true;
  reverse.preload = "auto";
  reverse.src = REVERSE_SRC;
  stageEl.appendChild(reverse);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let destroyed = false;
  let useReverseAsset = false;
  let rafId = 0;
  let vfcId = 0;
  let lastStepAt = 0;

  const cancelFallback = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (vfcId && typeof forward.cancelVideoFrameCallback === "function") {
      forward.cancelVideoFrameCallback(vfcId);
    }
    rafId = 0;
    vfcId = 0;
  };

  const showForward = () => {
    forward.classList.remove("is-hidden");
    reverse.classList.add("is-hidden");
  };

  const showReverse = () => {
    forward.classList.add("is-hidden");
    reverse.classList.remove("is-hidden");
  };

  const playForward = () => {
    if (destroyed) return;
    showForward();
    forward.currentTime = 0;
    forward.play().catch(() => {});
  };

  const playReverseAsset = () => {
    if (destroyed) return;
    showReverse();
    reverse.currentTime = 0;
    reverse.play().catch(() => playForward());
  };

  const scheduleReverseStep = () => {
    if (typeof forward.requestVideoFrameCallback === "function") {
      vfcId = forward.requestVideoFrameCallback(stepReverseScrub);
    } else {
      rafId = requestAnimationFrame(stepReverseScrub);
    }
  };

  const stepReverseScrub = () => {
    if (destroyed) return;
    const now = performance.now();
    if (now - lastStepAt < FRAME_INTERVAL_MS) {
      scheduleReverseStep();
      return;
    }
    lastStepAt = now;
    const next = forward.currentTime - 1 / FALLBACK_FPS;
    if (next <= END_EPSILON) {
      forward.currentTime = 0;
      forward.play().catch(() => {});
      return;
    }
    if (typeof forward.fastSeek === "function") forward.fastSeek(next);
    else forward.currentTime = next;
    scheduleReverseStep();
  };

  const playReverseScrub = () => {
    if (destroyed) return;
    forward.pause();
    lastStepAt = 0;
    scheduleReverseStep();
  };

  const onForwardEnded = () => {
    if (useReverseAsset) playReverseAsset();
    else playReverseScrub();
  };

  const onReverseEnded = () => {
    if (useReverseAsset) playForward();
  };

  const onVisibility = () => {
    if (document.hidden) {
      forward.pause();
      reverse.pause();
      cancelFallback();
      return;
    }
    if (reducedMotion.matches || !useReverseAsset) {
      forward.play().catch(() => {});
    } else {
      playForward();
    }
  };

  const onMotionChange = () => {
    if (reducedMotion.matches) {
      cancelFallback();
      forward.loop = true;
      showForward();
      forward.currentTime = 0;
      forward.play().catch(() => {});
    } else {
      forward.loop = false;
      playForward();
    }
  };

  forward.addEventListener("ended", onForwardEnded);
  reverse.addEventListener("ended", onReverseEnded);
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", onMotionChange);

  const probeReverse = () => {
    if (reducedMotion.matches) {
      forward.loop = true;
      forward.play().catch(() => {});
      return;
    }
    const settle = (ok) => {
      if (destroyed) return;
      useReverseAsset = ok;
      playForward();
    };
    if (reverse.readyState >= 1) {
      settle(reverse.duration > 0);
      return;
    }
    reverse.addEventListener("loadedmetadata", () => settle(reverse.duration > 0), { once: true });
    reverse.addEventListener("error", () => settle(false), { once: true });
  };

  probeReverse();

  return () => {
    destroyed = true;
    cancelFallback();
    forward.removeEventListener("ended", onForwardEnded);
    reverse.removeEventListener("ended", onReverseEnded);
    document.removeEventListener("visibilitychange", onVisibility);
    reducedMotion.removeEventListener("change", onMotionChange);
    forward.pause();
    reverse.pause();
    reverse.remove();
  };
}