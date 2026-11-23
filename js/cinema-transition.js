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

    const viewportHeight = stage.clientHeight;
    if (!viewportHeight) return;

    const scrollTop = stage.scrollTop;
    const viewportCenter = viewportHeight * CENTER_RATIO;

    for (const screen of screens) {
      // Layout coordinates only: getBoundingClientRect would include the transform
      // we are about to write and feed it back into the next frame.
      const screenCenter =
        screen.offsetTop + screen.offsetHeight * CENTER_RATIO - scrollTop;
      // progress: 0 when centered, ±1 when a full screen away
      const progress = clamp(
        (screenCenter - viewportCenter) / viewportHeight,
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