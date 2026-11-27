const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function mount(stage) {
  const video = stage.querySelector(".hero-media__video");
  if (!video) return;

  const reducedMotion = window.matchMedia(REDUCED_MOTION);

  const play = () => {
    if (reducedMotion.matches) {
      video.pause();
      return;
    }
    video.play().catch(() => {});
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      video.pause();
    } else {
      play();
    }
  };

  const onMotionChange = () => {
    if (reducedMotion.matches) {
      video.pause();
    } else {
      play();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener("change", onMotionChange);

  play();

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.removeEventListener("change", onMotionChange);
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
}