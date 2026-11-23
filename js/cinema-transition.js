/**
 * cinema-transition.js — scroll-driven 3D screen-to-screen transitions,
 * fully contained inside the static .cinema-frame window.
 *
 * Containment contract (the frame is a static border, nothing escapes it):
 * 1. The frame never transforms. All 3D motion happens inside .cinema-stage,
 *    which is hard-clipped by the frame (overflow) and by itself
 *    (clip-path: inset(0) + transform-style: flat, see main.css).
 * 2. Transform order `translateZ(-depth) rotateX(r) scale(s)` puts scale()
 *    innermost: the screen shrinks BEFORE it rotates, so the perspective
 *    magnification of the near edge acts on pre-shrunk geometry and can
 *    never push a corner past the frame's inner rectangle.
 * 3. MAX_DEPTH (140px) >= sin(MAX_ROTATION) * (viewportH / 2) * MIN_SCALE,
 *    so at full transition depth the near edge sits behind the z=0 plane
 *    (safe for viewports up to ~1600px tall).
 * 4. Screens taller than the viewport get their rotation damped so their
 *    near edge can never pierce the border.
 * 5. At rest, inline styles are stripped — the settled screen is a plain
 *    static, full-bleed layout inside the frame.
 */

const MAX_ROTATION_DEG = 11;
const MAX_DEPTH_PX = 140;
const MIN_SCALE = 0.92;
const MIN_OPACITY = 0.2;
const CENTER_RATIO = 0.5;
const PROGRESS_LIMIT = 1;
const MIN_SCREENS = 2;
const HEIGHT_DAMP_MIN = 0.35;
const AT_REST_EPSILON = 0.001;

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

      // At rest: strip inline styles so the settled screen is a completely
      // static, full-bleed layout — no transform, no composited layer.
      if (distance < AT_REST_EPSILON) {
        screen.style.transform = "";
        screen.style.opacity = "";
        continue;
      }

      // Damp rotation for screens taller than the viewport so their
      // projected near edge can never pierce the static frame border.
      const heightDamp = clamp(
        viewportHeight / screen.offsetHeight,
        HEIGHT_DAMP_MIN,
        1
      );

      const rotation = -progress * MAX_ROTATION_DEG * heightDamp;
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
