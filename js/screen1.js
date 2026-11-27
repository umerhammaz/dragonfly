// ping-pong (forward -> reverse -> forward) loop for the screen1 hero video.
// native `loop` restarts; playbackRate=-1 is unreliable; we own the loop. no deps.
const VIDEO_SELECTOR = ".screen1-video";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FORWARD = 1;
const REVERSE = -1;
const END_EPSILON_S = 1 / 240; // clamp inside last frame; `ended`/seek can't overshoot
const MAX_STEP_S = 0.05; // clamp dt for 1x reverse at low fps / tab stalls
const REVERSE_SPEED = 1; // reverse speed == forward speed
const VISIBLE_THRESHOLD = 0.01;
const READY_STATE_CAN_PLAY = 2; // HAVE_CURRENT_DATA
const MS_PER_SECOND = 1000;

function mountPingPong(video, reduced) {
  let active = false;
  let phase = FORWARD;
  let frame = 0; // rAF id
  let visible = true;
  let position = 0; // reverse cursor, seconds
  let lastTs = 0;

  const duration = () => (Number.isFinite(video.duration) ? video.duration : 0);
  const cancelFrame = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  const canRun = () =>
    active && !reduced.matches && !document.hidden && visible && !video.error && duration() > 0;

  const seek = (t) => {
    try {
      video.currentTime = Math.max(0, Math.min(t, duration() - END_EPSILON_S));
    } catch {
      // seek can throw before metadata / on detached node
    }
  };

  const forward = (reset) => {
    cancelFrame();
    phase = FORWARD;
    if (reset) seek(0);
    if (!canRun()) return;
    video.play().catch(() => {}); // silent; first frame remains if blocked
  };

  const stepBack = (ts) => {
    if (!canRun() || phase !== REVERSE) {
      frame = 0;
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / MS_PER_SECOND, MAX_STEP_S);
    lastTs = ts;
    position -= dt * REVERSE_SPEED;
    if (position <= 0) {
      cancelFrame();
      seek(0);
      forward(false); // reverse hit start -> forward (ping-pong)
      return;
    }
    if (!video.seeking) seek(position); // don't pile seeks
    frame = requestAnimationFrame(stepBack);
  };

  const reverse = () => {
    cancelFrame();
    phase = REVERSE;
    video.pause();
    position = Math.max(0, Math.min(video.currentTime, duration() - END_EPSILON_S)); // resync; no drift
    lastTs = 0;
    if (!canRun()) return;
    frame = requestAnimationFrame(stepBack);
  };

  const onEnded = () => {
    if (canRun() && phase === FORWARD) reverse();
  };
  const onCanPlay = () => {
    if (active || reduced.matches) return;
    active = true;
    forward(false);
  };
  const onError = () => {
    active = false; // degrade: hold last frame
    cancelFrame();
    video.pause();
  };
  const onVisibility = () => {
    if (document.hidden) {
      cancelFrame();
      video.pause();
      return;
    }
    if (canRun()) phase === REVERSE ? reverse() : forward(false);
  };
  const onMotionChange = () => {
    if (reduced.matches) {
      active = false;
      cancelFrame();
      video.pause();
      seek(0);
      return;
    }
    active = true;
    forward(true);
  };

  video.loop = false; // we own ping-pong; not native restart
  video.muted = true;
  video.playsInline = true;

  video.addEventListener("ended", onEnded);
  video.addEventListener("canplay", onCanPlay, { once: true });
  video.addEventListener("error", onError);
  document.addEventListener("visibilitychange", onVisibility);
  reduced.addEventListener?.("change", onMotionChange);

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            visible = Boolean(entries[0] && entries[0].isIntersecting);
            if (!visible) {
              cancelFrame();
              video.pause();
              return;
            }
            if (canRun()) phase === REVERSE ? reverse() : forward(false);
          },
          { threshold: VISIBLE_THRESHOLD }
        )
      : null; // feature-detect
  observer?.observe(video);

  if (reduced.matches) {
    active = false;
    video.pause();
    seek(0); // reduced-motion -> static first frame, no ping-pong
  } else if (video.readyState >= READY_STATE_CAN_PLAY) {
    onCanPlay();
  }

  return () => {
    active = false;
    cancelFrame();
    video.pause();
    video.removeEventListener("ended", onEnded);
    video.removeEventListener("canplay", onCanPlay);
    video.removeEventListener("error", onError);
    document.removeEventListener("visibilitychange", onVisibility);
    reduced.removeEventListener?.("change", onMotionChange);
    observer?.disconnect();
  };
}

export function mount(stage) {
  const video = stage.querySelector(VIDEO_SELECTOR);
  if (!video) return () => {};
  const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
  return mountPingPong(video, reduced);
}