const LOGO_BASE = "./LLM-Chat-Logos/SVG/";
const HOLD_MS = 2200;
const EXIT_MS = 160;
const EXIT_STAGGER_MS = 35;
const SWAP_DELAY_MS = EXIT_MS + EXIT_STAGGER_MS;
const ENTER_MS = 260;
const ENTER_STAGGER_MS = 40;
const SETTLE_MS = ENTER_MS + ENTER_STAGGER_MS;
const SQUISH_MS = 150;
const ENTER_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const MODELS = [
  { name: "ChatGPT", file: "openai.svg" },
  { name: "Claude", file: "claude.svg" },
  { name: "Gemini", file: "gemini.svg" },
  { name: "DeepSeek", file: "deepseek.svg" },
  { name: "Grok", file: "grok.svg" },
  { name: "Qwen", file: "qwen.svg" },
  { name: "Kimi", file: "kimi.svg" },
  { name: "Mistral", file: "mistral.svg" },
  { name: "Command", file: "commanda.svg" },
  { name: "GLM", file: "glmv.svg" },
  { name: "Gemma", file: "gemma.svg" },
  { name: "MiniMax", file: "minimax.svg" },
  { name: "Nova", file: "nova.svg" },
  { name: "Doubao", file: "doubao.svg" },
  { name: "Hunyuan", file: "hunyuan.svg" },
  { name: "Wenxin", file: "wenxin.svg" },
  { name: "Spark", file: "spark.svg" }
];

const TOTAL_LABEL = String(MODELS.length).padStart(2, "0");

function preloadLogos() {
  for (const model of MODELS) {
    const img = new Image();
    img.src = `${LOGO_BASE}${model.file}`;
  }
}

export function mount(stage) {
  const pill = stage.querySelector(".llm-pill");
  const icon = stage.querySelector(".llm-pill__icon");
  const nameEl = stage.querySelector(".llm-pill__name");
  const sizer = stage.querySelector(".llm-pill__sizer");
  const sizerName = stage.querySelector(".llm-pill__sizer-name");
  const counter = stage.querySelector(".s2-counter");

  if (!pill || !icon || !nameEl || !sizer || !sizerName || !counter) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let currentIndex = 0;
  let isAnimating = false;
  let isPaused = false;
  let disposed = false;

  let cycleTimer = 0;
  let swapTimer = 0;
  let settleTimer = 0;
  let squishTimer = 0;
  let readyFrame = 0;

  const measureWidth = (label) => {
    sizerName.textContent = label;
    return Math.ceil(sizer.getBoundingClientRect().width);
  };

  const syncWidth = (label = MODELS[currentIndex].name) => {
    pill.style.width = `${measureWidth(label)}px`;
  };

  const applyModel = (index) => {
    currentIndex = index;
    const model = MODELS[currentIndex];
    icon.src = `${LOGO_BASE}${model.file}`;
    nameEl.textContent = model.name;
    counter.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${TOTAL_LABEL}`;
    pill.setAttribute("aria-label", `Cycle AI model (currently ${model.name})`);
  };

  const stopCycle = () => {
    clearTimeout(cycleTimer);
    cycleTimer = 0;
  };

  const scheduleCycle = () => {
    stopCycle();
    if (disposed || isPaused || document.hidden || reducedMotion.matches) return;
    cycleTimer = setTimeout(() => step(1, false), HOLD_MS);
  };

  const triggerSquish = () => {
    pill.classList.add("is-squished");
    clearTimeout(squishTimer);
    squishTimer = setTimeout(() => pill.classList.remove("is-squished"), SQUISH_MS);
  };

  const step = (direction, manual) => {
    if (disposed || isAnimating) return;
    const nextIndex = (currentIndex + direction + MODELS.length) % MODELS.length;
    const nextModel = MODELS[nextIndex];

    if (manual) triggerSquish();

    if (reducedMotion.matches) {
      applyModel(nextIndex);
      syncWidth(nextModel.name);
      scheduleCycle();
      return;
    }

    isAnimating = true;
    stopCycle();
    syncWidth(nextModel.name);

    const animOut = direction > 0 ? "slideOutUp" : "slideOutDown";
    const animIn = direction > 0 ? "slideInUp" : "slideInDown";

    icon.style.animation = `${animOut} ${EXIT_MS}ms ease-in forwards`;
    nameEl.style.animation = `${animOut} ${EXIT_MS}ms ease-in ${EXIT_STAGGER_MS}ms forwards`;

    swapTimer = setTimeout(() => {
      if (disposed) return;
      applyModel(nextIndex);

      // `both` holds the staggered label off-frame during its delay to avoid a flash
      icon.style.animation = `${animIn} ${ENTER_MS}ms ${ENTER_EASE} both`;
      nameEl.style.animation = `${animIn} ${ENTER_MS}ms ${ENTER_EASE} ${ENTER_STAGGER_MS}ms both`;

      settleTimer = setTimeout(() => {
        if (disposed) return;
        icon.style.animation = "none";
        nameEl.style.animation = "none";
        isAnimating = false;
        scheduleCycle();
      }, SETTLE_MS);
    }, SWAP_DELAY_MS);
  };

  const setPaused = (paused) => {
    isPaused = paused;
    if (paused) stopCycle();
    else scheduleCycle();
  };

  const onClick = () => step(1, true);

  const onWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY > 0) step(1, true);
    else if (e.deltaY < 0) step(-1, true);
  };

  const onPointerEnter = () => setPaused(true);
  const onPointerLeave = () => setPaused(false);
  const onFocusIn = () => setPaused(true);
  const onFocusOut = () => setPaused(false);

  const onVisibilityChange = () => {
    if (document.hidden) stopCycle();
    else scheduleCycle();
  };

  const onReducedMotionChange = () => {
    if (reducedMotion.matches) stopCycle();
    else scheduleCycle();
  };

  const resizeObserver = new ResizeObserver(() => {
    if (!isAnimating) syncWidth();
  });
  resizeObserver.observe(stage);

  pill.addEventListener("click", onClick);
  pill.addEventListener("wheel", onWheel, { passive: false });
  pill.addEventListener("pointerenter", onPointerEnter);
  pill.addEventListener("pointerleave", onPointerLeave);
  pill.addEventListener("focusin", onFocusIn);
  pill.addEventListener("focusout", onFocusOut);
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener("change", onReducedMotionChange);

  preloadLogos();
  applyModel(0);
  syncWidth();

  // Enable width transitions after initial measurement to prevent an entry jump
  readyFrame = requestAnimationFrame(() => {
    if (!disposed) pill.classList.add("is-ready");
  });

  document.fonts?.ready.then(() => {
    if (!disposed && !isAnimating) syncWidth();
  });

  scheduleCycle();

  return () => {
    disposed = true;
    stopCycle();
    clearTimeout(swapTimer);
    clearTimeout(settleTimer);
    clearTimeout(squishTimer);
    cancelAnimationFrame(readyFrame);
    resizeObserver.disconnect();
    pill.removeEventListener("click", onClick);
    pill.removeEventListener("wheel", onWheel);
    pill.removeEventListener("pointerenter", onPointerEnter);
    pill.removeEventListener("pointerleave", onPointerLeave);
    pill.removeEventListener("focusin", onFocusIn);
    pill.removeEventListener("focusout", onFocusOut);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.removeEventListener("change", onReducedMotionChange);
  };
}
