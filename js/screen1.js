const MAX_CAPTURE_DIM = 720;
const MIN_CAPTURE_DIM = 160;
const MAX_BUFFER_BYTES = 48 * 1024 * 1024;
const BYTES_PER_PIXEL = 4;
const MAX_BUFFER_DURATION_S = 8;
const MIN_FRAME_INTERVAL_S = 1 / 30;
const MIN_BUFFER_FRAMES = 4;
const LOW_MEMORY_GB = 2;
const MAX_DT_S = 0.05;
const END_GUARD_S = 0.04;
const START_GUARD_S = 0.015;

function computeCaptureSize(videoWidth, videoHeight, duration) {
  if (!videoWidth || !videoHeight || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  if (duration > MAX_BUFFER_DURATION_S) return null;
  if (navigator.deviceMemory != null && navigator.deviceMemory <= LOW_MEMORY_GB) {
    return null;
  }

  let scale = Math.min(1, MAX_CAPTURE_DIM / Math.max(videoWidth, videoHeight));
  let width = Math.round(videoWidth * scale);
  let height = Math.round(videoHeight * scale);

  const estimatedFrames = Math.max(1, Math.ceil(duration / MIN_FRAME_INTERVAL_S) + 2);
  const maxPixelsPerFrame = MAX_BUFFER_BYTES / (estimatedFrames * BYTES_PER_PIXEL);
  const currentPixels = width * height;

  if (currentPixels > maxPixelsPerFrame) {
    const budgetScale = Math.sqrt(maxPixelsPerFrame / currentPixels);
    width = Math.round(width * budgetScale);
    height = Math.round(height * budgetScale);
  }

  if (Math.min(width, height) < MIN_CAPTURE_DIM) return null;
  return { width, height };
}

function findNearestFrameIndex(frames, targetTime) {
  let lo = 0;
  let hi = frames.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].time < targetTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  if (lo > 0) {
    const prevDiff = Math.abs(frames[lo - 1].time - targetTime);
    const currDiff = Math.abs(frames[lo].time - targetTime);
    if (prevDiff <= currDiff) return lo - 1;
  }

  return lo;
}

export function mount(stage) {
  const media = stage.querySelector(".hero-media");
  const frameEl = stage.querySelector(".hero-media__frame");
  const video = stage.querySelector(".hero-media__video");
  const canvas = stage.querySelector(".hero-media__canvas");
  if (!media || !frameEl || !video || !canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasVfc = typeof video.requestVideoFrameCallback === "function";

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = false;

  let mode = "pending";
  let destroyed = false;
  let metadataHandled = false;
  let revealed = false;
  let duration = 0;
  let captureW = 0;
  let captureH = 0;
  let frames = [];
  let capturePending = 0;
  let captureEnded = false;
  let captureFailed = false;
  let lastCapturedTime = -1;
  let playTime = 0;
  let minTime = 0;
  let maxTime = 0;
  let direction = 1;
  let drawnIndex = -1;
  let seekTarget = 0;
  let isSeeking = false;
  let prevNow = 0;
  let rafId = 0;
  let vfcId = 0;
  let gestureArmed = false;

  const reveal = () => {
    if (destroyed || revealed) return;
    revealed = true;
    media.classList.add("is-ready");
  };

  const cancelLoops = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (vfcId && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(vfcId);
      vfcId = 0;
    }
    prevNow = 0;
  };

  const releaseFrames = () => {
    for (let i = 0; i < frames.length; i++) {
      frames[i].bitmap.close();
    }
    frames = [];
    drawnIndex = -1;
  };

  const disarmGestureRetry = () => {
    if (!gestureArmed) return;
    gestureArmed = false;
    window.removeEventListener("pointerdown", onGestureRetry);
    window.removeEventListener("keydown", onGestureRetry);
  };

  const armGestureRetry = () => {
    if (destroyed || gestureArmed) return;
    gestureArmed = true;
    window.addEventListener("pointerdown", onGestureRetry, { once: true, passive: true });
    window.addEventListener("keydown", onGestureRetry, { once: true, passive: true });
  };

  const safePlay = () => {
    if (destroyed || document.hidden || reducedMotion.matches) return;
    const promise = video.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        if (!destroyed && !document.hidden && !reducedMotion.matches) {
          armGestureRetry();
        }
      });
    }
  };

  const drawFrameAt = (index) => {
    if (!ctx || index === drawnIndex || !frames[index]) return;
    ctx.drawImage(frames[index].bitmap, 0, 0, captureW, captureH);
    drawnIndex = index;
    reveal();
  };

  const enterSeekReverse = () => {
    cancelLoops();
    video.pause();
    mode = "seek-reverse";
    isSeeking = false;
    seekTarget = Math.max(0, Math.min(video.currentTime || duration, duration - END_GUARD_S));
    if (!document.hidden && !reducedMotion.matches) {
      rafId = requestAnimationFrame(tickSeekReverse);
    }
  };

  const enterSeekForward = () => {
    cancelLoops();
    mode = "seek-forward";
    isSeeking = false;
    if (video.currentTime > START_GUARD_S) {
      video.currentTime = 0;
    }
    if (!document.hidden && !reducedMotion.matches) {
      safePlay();
      rafId = requestAnimationFrame(tickSeekForward);
    }
  };

  const tickSeekForward = () => {
    rafId = 0;
    if (destroyed || mode !== "seek-forward" || document.hidden || reducedMotion.matches) return;
    if (duration > END_GUARD_S && video.currentTime >= duration - END_GUARD_S) {
      enterSeekReverse();
      return;
    }
    rafId = requestAnimationFrame(tickSeekForward);
  };

  const tickSeekReverse = (now) => {
    rafId = 0;
    if (destroyed || mode !== "seek-reverse" || document.hidden || reducedMotion.matches) return;

    const dt = prevNow === 0 ? 0 : Math.min(Math.max((now - prevNow) * 0.001, 0), MAX_DT_S);
    prevNow = now;
    seekTarget -= dt;

    if (seekTarget <= START_GUARD_S) {
      enterSeekForward();
      return;
    }

    if (!isSeeking) {
      isSeeking = true;
      video.currentTime = seekTarget;
    }

    rafId = requestAnimationFrame(tickSeekReverse);
  };

  const tickBuffered = (now) => {
    rafId = 0;
    if (destroyed || mode !== "buffered" || document.hidden || reducedMotion.matches) return;

    const dt = prevNow === 0 ? 0 : Math.min(Math.max((now - prevNow) * 0.001, 0), MAX_DT_S);
    prevNow = now;
    playTime += dt * direction;

    if (playTime >= maxTime) {
      playTime = Math.max(minTime, maxTime - (playTime - maxTime));
      direction = -1;
    } else if (playTime <= minTime) {
      playTime = Math.min(maxTime, minTime + (minTime - playTime));
      direction = 1;
    }

    drawFrameAt(findNearestFrameIndex(frames, playTime));
    rafId = requestAnimationFrame(tickBuffered);
  };

  const finalizeCapture = () => {
    if (destroyed || mode !== "capturing" || !captureEnded || capturePending > 0) return;

    if (captureFailed || frames.length < MIN_BUFFER_FRAMES) {
      releaseFrames();
      enterSeekReverse();
      return;
    }

    frames.sort((a, b) => a.time - b.time);
    minTime = frames[0].time;
    maxTime = frames[frames.length - 1].time;

    if (maxTime <= minTime) {
      releaseFrames();
      enterSeekReverse();
      return;
    }

    mode = "buffered";
    direction = -1;
    playTime = maxTime;
    video.pause();
    drawFrameAt(frames.length - 1);
    media.classList.add("is-canvas");

    if (!document.hidden && !reducedMotion.matches) {
      prevNow = 0;
      rafId = requestAnimationFrame(tickBuffered);
    }
  };

  const captureFrame = (mediaTime, force = false) => {
    if (destroyed || captureFailed || !ctx) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (!force && lastCapturedTime >= 0 && mediaTime - lastCapturedTime < MIN_FRAME_INTERVAL_S) {
      return;
    }

    lastCapturedTime = mediaTime;
    ctx.drawImage(video, 0, 0, captureW, captureH);
    capturePending += 1;

    createImageBitmap(canvas)
      .then((bitmap) => {
        if (destroyed || captureFailed) {
          bitmap.close();
          return;
        }
        frames.push({ bitmap, time: mediaTime });
      })
      .catch(() => {
        captureFailed = true;
      })
      .finally(() => {
        capturePending -= 1;
        if (captureEnded) finalizeCapture();
      });
  };

  const scheduleCaptureStep = () => {
    if (destroyed || mode !== "capturing" || document.hidden || reducedMotion.matches) return;
    if (hasVfc) {
      vfcId = video.requestVideoFrameCallback((_, meta) => {
        vfcId = 0;
        if (destroyed || mode !== "capturing") return;
        captureFrame(meta.mediaTime);
        scheduleCaptureStep();
      });
    } else {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (destroyed || mode !== "capturing") return;
        captureFrame(video.currentTime);
        scheduleCaptureStep();
      });
    }
  };

  const startPlayback = () => {
    if (destroyed || !metadataHandled) return;

    if (reducedMotion.matches) {
      cancelLoops();
      video.pause();
      if (mode === "buffered" && frames.length > 0) {
        drawFrameAt(0);
      } else {
        mode = "static";
        if (video.currentTime > START_GUARD_S) video.currentTime = 0;
      }
      return;
    }

    if (mode === "buffered") {
      if (!document.hidden && !rafId) {
        prevNow = 0;
        rafId = requestAnimationFrame(tickBuffered);
      }
      return;
    }

    if (mode === "capturing") {
      if (!document.hidden) {
        safePlay();
        scheduleCaptureStep();
      }
      return;
    }

    if (mode === "seek-reverse") {
      if (!document.hidden && !rafId) {
        prevNow = 0;
        rafId = requestAnimationFrame(tickSeekReverse);
      }
      return;
    }

    const size =
      ctx && typeof createImageBitmap === "function"
        ? computeCaptureSize(video.videoWidth, video.videoHeight, duration)
        : null;

    if (size) {
      captureW = size.width;
      captureH = size.height;
      canvas.width = captureW;
      canvas.height = captureH;
      mode = "capturing";
      captureEnded = false;
      captureFailed = false;
      lastCapturedTime = -1;
      if (!document.hidden) {
        safePlay();
        scheduleCaptureStep();
      }
      return;
    }

    enterSeekForward();
  };

  const onGestureRetry = () => {
    gestureArmed = false;
    startPlayback();
  };

  const onMetadata = () => {
    if (destroyed || metadataHandled) return;
    metadataHandled = true;
    duration = video.duration;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      frameEl.style.setProperty("--media-ratio", String(video.videoWidth / video.videoHeight));
    }
    startPlayback();
  };

  const onLoadedData = () => {
    reveal();
  };

  const onEnded = () => {
    if (destroyed) return;
    if (mode === "capturing") {
      captureFrame(Number.isFinite(duration) ? duration : video.currentTime, true);
      captureEnded = true;
      cancelLoops();
      finalizeCapture();
      return;
    }
    if (mode === "seek-forward") {
      enterSeekReverse();
    }
  };

  const onSeeked = () => {
    isSeeking = false;
  };

  const onError = () => {
    cancelLoops();
    releaseFrames();
    disarmGestureRetry();
  };

  const onVisibilityChange = () => {
    if (destroyed || !metadataHandled) return;
    if (document.hidden) {
      cancelLoops();
      video.pause();
      return;
    }
    startPlayback();
  };

  const onMotionChange = () => {
    if (destroyed || !metadataHandled) return;
    if (reducedMotion.matches) {
      startPlayback();
      return;
    }
    if (mode === "static") mode = "pending";
    startPlayback();
  };

  video.addEventListener("loadedmetadata", onMetadata, { once: true });
  video.addEventListener("loadeddata", onLoadedData, { once: true });
  video.addEventListener("ended", onEnded);
  video.addEventListener("seeked", onSeeked);
  video.addEventListener("error", onError);
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener("change", onMotionChange);

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onMetadata();
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) reveal();

  return () => {
    destroyed = true;
    cancelLoops();
    disarmGestureRetry();
    releaseFrames();
    video.removeEventListener("loadedmetadata", onMetadata);
    video.removeEventListener("loadeddata", onLoadedData);
    video.removeEventListener("ended", onEnded);
    video.removeEventListener("seeked", onSeeked);
    video.removeEventListener("error", onError);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.removeEventListener("change", onMotionChange);
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
}