const MAX_ROTATION_DEG = 14;
const MAX_DEPTH_PX = 160;
const MIN_SCALE = 0.92;
const MIN_OPACITY = 0.2;
const CENTER_RATIO = 0.5;
const PROGRESS_LIMIT = 1;
const MIN_SCREENS = 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function initCinemaTransition() {
  const stage = document.querySelector(".cinema-stage");
  if (!stage) return () => {};

  const screens = Array.from(stage.querySelectorAll("[data-screen]"));
  if (screens.length < MIN_SCREENS) return () => {};

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  let rafId = null;

  const apply = () => {
    rafId = null;

    const stageRect = stage.getBoundingClientRect();
    const stageCenter = stageRect.top + stageRect.height * CENTER_RATIO;

    for (const screen of screens) {
      const rect = screen.getBoundingClientRect();
      const screenCenter = rect.top + rect.height * CENTER_RATIO;
      // progress: 0 when centered, ±1 when a full screen away
      const progress = clamp(
        (screenCenter - stageCenter) / stageRect.height,
        -PROGRESS_LIMIT,
        PROGRESS_LIMIT
      );
      const distance = Math.abs(progress);

      const rotation = -progress * MAX_ROTATION_DEG;
      const depth = distance * MAX_DEPTH_PX;
      const scale = 1 - distance * (1 - MIN_SCALE);
      const opacity = 1 - distance * (1 - MIN_OPACITY);

      screen.style.transform = `translateZ(-${depth}px) rotateX(${rotation}deg) scale(${scale})`;
      screen.style.opacity = opacity.toFixed(3);
    }
  };

  const schedule = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(apply);
  };

  stage.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  apply();

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    stage.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    for (const screen of screens) {
      screen.style.transform = "";
      screen.style.opacity = "";
    }
  };
}