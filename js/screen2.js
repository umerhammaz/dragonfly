const LOGO_BASE = "./LLM-Chat-Logos/SVG/";
const CYCLE_INTERVAL_MS = 1850;
const SWAP_CLEANUP_MS = 600;
const WIDTH_BUFFER_PX = 2;

// Ordered from highest to lowest global brand recognition
const MODELS = [
  { name: "ChatGPT", file: "openai.svg" },
  { name: "Claude", file: "claude.svg" },
  { name: "DeepSeek", file: "deepseek.svg" },
  { name: "Gemini", file: "gemini.svg" },
  { name: "Grok", file: "grok.svg" },
  { name: "Qwen", file: "qwen.svg" },
  { name: "Mistral", file: "mistral.svg" },
  { name: "Gemma", file: "gemma.svg" },
  { name: "Kimi", file: "kimi.svg" },
  { name: "GLM", file: "glmv.svg" },
  { name: "Command", file: "commanda.svg" },
  { name: "Nova", file: "nova.svg" },
  { name: "MiniMax", file: "minimax.svg" },
  { name: "Doubao", file: "doubao.svg" },
  { name: "Hunyuan", file: "hunyuan.svg" },
  { name: "ERNIE", file: "wenxin.svg" },
  { name: "Spark", file: "spark.svg" }
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

  let currentIndex = 0;
  let widths = [];
  let destroyed = false;
  let cycleTimer = 0;
  let cleanupTimer = 0;

  for (const model of MODELS) {
    const img = new Image();
    img.src = `${LOGO_BASE}${model.file}`;
    img.decode?.().catch(() => {});
  }

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

  const step = () => {
    currentIndex = (currentIndex + 1) % MODELS.length;

    clearTimeout(cleanupTimer);
    for (const stale of viewport.querySelectorAll(".is-exit")) {
      stale.remove();
    }

    const outgoing = viewport.querySelector(".is-current");
    const incoming = createItemEl(MODELS[currentIndex]);
    incoming.classList.add("is-current", "is-enter");

    applyWidth(currentIndex);
    pill.classList.add("is-swapping");

    if (outgoing) {
      outgoing.classList.remove("is-current", "is-enter");
      outgoing.classList.add("is-exit");
    }

    viewport.append(incoming);

    cleanupTimer = setTimeout(() => {
      outgoing?.remove();
      incoming.classList.remove("is-enter");
      pill.classList.remove("is-swapping");
    }, SWAP_CLEANUP_MS);
  };

  const scheduleCycle = () => {
    stopCycle();
    if (destroyed || document.hidden) return;
    cycleTimer = setTimeout(() => {
      step();
      scheduleCycle();
    }, CYCLE_INTERVAL_MS);
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      stopCycle();
    } else {
      scheduleCycle();
    }
  };

  const resizeObserver = new ResizeObserver(measureWidths);
  resizeObserver.observe(stage);
  document.addEventListener("visibilitychange", onVisibilityChange);

  measureWidths();
  document.fonts?.ready.then(measureWidths);
  scheduleCycle();

  return () => {
    destroyed = true;
    stopCycle();
    clearTimeout(cleanupTimer);
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}