import { CURSOR_NUDGE_EVENT } from "./cursor.js";

const LOGO_BASE = "./LLM-Chat-Logos/SVG/";
const CYCLE_INTERVAL_MS = 2200;
const EXIT_CLEANUP_MS = 340;
const SQUISH_MS = 140;
const WHEEL_COOLDOWN_MS = 240;
const WIDTH_BUFFER_PX = 2;

const MODELS = [
  { name: "ChatGPT", file: "openai.svg" },
  { name: "Claude", file: "claude.svg" },
  { name: "Gemini", file: "gemini.svg" },
  { name: "DeepSeek", file: "deepseek.svg" },
  { name: "Grok", file: "grok.svg" },
  { name: "Qwen", file: "qwen.svg" },
  { name: "Mistral", file: "mistral.svg" },
  { name: "Kimi", file: "kimi.svg" },
  { name: "Gemma", file: "gemma.svg" },
  { name: "GLM", file: "glmv.svg" },
  { name: "MiniMax", file: "minimax.svg" },
  { name: "Command", file: "commanda.svg" },
  { name: "Doubao", file: "doubao.svg" },
  { name: "Hunyuan", file: "hunyuan.svg" },
  { name: "ERNIE", file: "wenxin.svg" },
  { name: "Spark", file: "spark.svg" },
  { name: "Nova", file: "nova.svg" }
];

function createItemEl(model) {
  const item = document.createElement("span");
  item.className = "llm-pill__item";

  const img = document.createElement("img");
  img.className = "llm-pill__icon";
  img.src = `${LOGO_BASE}${model.file}`;
  img.alt = "";
  img.width = 24;
  img.height = 24;
  img.decoding = "async";

  const label = document.createElement("span");
  label.className = "llm-pill__name";
  label.textContent = model.name;

  item.append(img, label);
  return item;
}

export function mount(stage) {
  const pill = stage.querySelector(".llm-pill");
  const viewport = stage.querySelector(".llm-pill__viewport");
  if (!pill || !viewport) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let currentIndex = 0;
  let widths = [];
  let isHovered = false;
  let isFocused = false;
  let destroyed = false;
  let lastWheelAt = 0;
  let cycleTimer = 0;
  let cleanupTimer = 0;
  let squishTimer = 0;
  let audioCtx = null;

  for (const model of MODELS) {
    const img = new Image();
    img.src = `${LOGO_BASE}${model.file}`;
    img.decode?.().catch(() => {});
  }

  const playTick = () => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(760, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.045);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.045);
    } catch {
      // Ignore blocked audio contexts
    }
  };

  const applyWidth = (index) => {
    if (widths[index] > 0) {
      viewport.style.width = `${widths[index]}px`;
    }
  };

  const measureWidths = () => {
    if (destroyed) return;

    const probe = document.createElement("span");
    probe.className = "llm-pill__item";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";

    const probeImg = document.createElement("span");
    probeImg.className = "llm-pill__icon";
    const probeLabel = document.createElement("span");
    probeLabel.className = "llm-pill__name";
    probe.append(probeImg, probeLabel);
    pill.append(probe);

    widths = MODELS.map((model) => {
      probeLabel.textContent = model.name;
      return Math.ceil(probe.getBoundingClientRect().width) + WIDTH_BUFFER_PX;
    });

    probe.remove();
    applyWidth(currentIndex);
    if (!pill.classList.contains("is-ready")) {
      requestAnimationFrame(() => {
        if (!destroyed) pill.classList.add("is-ready");
      });
    }
  };

  const stopCycle = () => {
    clearTimeout(cycleTimer);
    cycleTimer = 0;
  };

  const scheduleCycle = () => {
    stopCycle();
    if (destroyed || document.hidden || isHovered || isFocused || reducedMotion.matches) {
      return;
    }
    cycleTimer = setTimeout(() => {
      step(1, false);
      scheduleCycle();
    }, CYCLE_INTERVAL_MS);
  };

  const step = (direction, interactive) => {
    const nextIndex = (currentIndex + direction + MODELS.length) % MODELS.length;
    currentIndex = nextIndex;

    clearTimeout(cleanupTimer);
    for (const stale of viewport.querySelectorAll(".is-exit-up, .is-exit-down")) {
      stale.remove();
    }

    const outgoing = viewport.querySelector(".is-current");
    const incoming = createItemEl(MODELS[nextIndex]);
    incoming.classList.add("is-current");

    applyWidth(nextIndex);

    if (reducedMotion.matches || !outgoing) {
      outgoing?.remove();
      viewport.append(incoming);
    } else {
      const exitClass = direction > 0 ? "is-exit-up" : "is-exit-down";
      const enterClass = direction > 0 ? "is-enter-up" : "is-enter-down";

      outgoing.classList.remove("is-current", "is-enter-up", "is-enter-down");
      outgoing.classList.add(exitClass);
      incoming.classList.add(enterClass);
      viewport.append(incoming);

      cleanupTimer = setTimeout(() => {
        outgoing.remove();
        incoming.classList.remove(enterClass);
      }, EXIT_CLEANUP_MS);
    }

    if (interactive) {
      playTick();
      pill.classList.add("is-squished");
      clearTimeout(squishTimer);
      squishTimer = setTimeout(() => pill.classList.remove("is-squished"), SQUISH_MS);
      scheduleCycle();
    }
  };

  const onClick = () => step(1, true);

  const onWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = performance.now();
    if (now - lastWheelAt < WHEEL_COOLDOWN_MS) return;
    if (e.deltaY === 0) return;
    lastWheelAt = now;
    const direction = e.deltaY > 0 ? 1 : -1;
    step(direction, true);
    pill.dispatchEvent(new CustomEvent(CURSOR_NUDGE_EVENT, { bubbles: true, detail: direction }));
  };

  const onPointerEnter = (e) => {
    if (e.pointerType === "touch") return;
    isHovered = true;
    stopCycle();
  };

  const onPointerLeave = (e) => {
    if (e.pointerType === "touch") return;
    isHovered = false;
    scheduleCycle();
  };

  const onFocusIn = () => {
    if (!pill.matches(":focus-visible")) return;
    isFocused = true;
    stopCycle();
  };

  const onFocusOut = () => {
    if (!isFocused) return;
    isFocused = false;
    scheduleCycle();
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      stopCycle();
    } else {
      scheduleCycle();
    }
  };

  const onMotionChange = () => scheduleCycle();

  const resizeObserver = new ResizeObserver(measureWidths);
  resizeObserver.observe(stage);

  pill.addEventListener("click", onClick);
  pill.addEventListener("wheel", onWheel, { passive: false });
  pill.addEventListener("pointerenter", onPointerEnter, { passive: true });
  pill.addEventListener("pointerleave", onPointerLeave, { passive: true });
  pill.addEventListener("focusin", onFocusIn);
  pill.addEventListener("focusout", onFocusOut);
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener("change", onMotionChange);

  measureWidths();
  document.fonts?.ready.then(measureWidths);
  scheduleCycle();

  return () => {
    destroyed = true;
    stopCycle();
    clearTimeout(cleanupTimer);
    clearTimeout(squishTimer);
    resizeObserver.disconnect();
    pill.removeEventListener("click", onClick);
    pill.removeEventListener("wheel", onWheel);
    pill.removeEventListener("pointerenter", onPointerEnter);
    pill.removeEventListener("pointerleave", onPointerLeave);
    pill.removeEventListener("focusin", onFocusIn);
    pill.removeEventListener("focusout", onFocusOut);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.removeEventListener("change", onMotionChange);
    if (audioCtx) audioCtx.close();
  };
}