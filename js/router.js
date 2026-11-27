export const DEFAULT_ROUTE = "screen1";

export const NAV_SECTIONS = [
  { id: "screen2", text: "Get Started", href: "#screen2" },
  { id: "features", text: "Features", href: "#features" },
  { id: "pricing", text: "Pricing", href: "#pricing" },
  { id: "docs", text: "Docs", href: "#docs" },
  { id: "screen1", text: "Home", href: "#screen1" }
];

const SCREENS = {
  screen1: { file: "./screens/screen1.html", title: "ZeroCommit", module: "./screen1.js" },
  screen2: {
    file: "./screens/screen2.html",
    css: "./css/screen2.css",
    module: "./screen2.js",
    title: "ZeroCommit — Get Started"
  }
};

const ROUTE_ALIASES = {
  "get-started": "screen2"
};

const ROUTE_PATTERN = /^[a-z0-9-]+$/;
const DYNAMIC_SCREEN_PATTERN = /^screen\d+$/;
const TRANSITION_MS = 140;

function parseRoute(hash) {
  const raw = hash.replace(/^#\/?/, "").trim().toLowerCase();
  if (!raw || !ROUTE_PATTERN.test(raw)) return DEFAULT_ROUTE;
  return ROUTE_ALIASES[raw] ?? raw;
}

function resolveScreen(routeId) {
  if (SCREENS[routeId]) return SCREENS[routeId];
  if (DYNAMIC_SCREEN_PATTERN.test(routeId)) {
    return { file: `./screens/${routeId}.html`, title: `ZeroCommit — ${routeId}` };
  }
  return null;
}

function renderFallback(routeId) {
  return `
    <section class="screen screen--content">
      <span class="screen-eyebrow">SCREEN NOT FOUND</span>
      <h1 class="screen-heading">${routeId}</h1>
      <p class="screen-copy">Add a screen fragment and register it to render inside the locked frame.</p>
      <div class="screen-actions">
        <a href="#${DEFAULT_ROUTE}" class="screen-link">Back to Screen 1</a>
      </div>
    </section>
  `;
}

export function initRouter(stage, { onRouteChange } = {}) {
  const htmlCache = new Map();
  const loadedStyles = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeCleanup = null;
  let activeController = null;
  let navToken = 0;
  let hasMounted = false;

  const loadStylesheet = (href) => {
    if (!href || loadedStyles.has(href)) return Promise.resolve();
    loadedStyles.add(href);

    return new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  };

  const fetchHtml = async (file, signal) => {
    if (htmlCache.has(file)) return htmlCache.get(file);
    const res = await fetch(file, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    htmlCache.set(file, html);
    return html;
  };

  const waitTransition = () => {
    if (!hasMounted || reducedMotion.matches) return Promise.resolve();
    stage.classList.add("is-transitioning");
    return new Promise((resolve) => setTimeout(resolve, TRANSITION_MS));
  };

  const render = async () => {
    const token = ++navToken;
    if (activeController) activeController.abort();
    activeController = new AbortController();

    const routeId = parseRoute(window.location.hash);
    const screen = resolveScreen(routeId);

    let html = null;
    let title = "ZeroCommit";

    if (screen) {
      title = screen.title;
      try {
        const [loadedHtml] = await Promise.all([
          fetchHtml(screen.file, activeController.signal),
          loadStylesheet(screen.css),
          waitTransition()
        ]);
        html = loadedHtml;
      } catch (err) {
        if (err.name === "AbortError") return;
        html = renderFallback(routeId);
      }
    } else {
      await waitTransition();
      html = renderFallback(routeId);
    }

    if (token !== navToken) return;

    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }

    stage.innerHTML = html;
    stage.scrollTop = 0;
    document.title = title;
    hasMounted = true;

    if (screen?.module) {
      const mod = await import(screen.module);
      if (token !== navToken) return;
      if (typeof mod.mount === "function") {
        const cleanup = mod.mount(stage);
        if (typeof cleanup === "function") activeCleanup = cleanup;
      }
    }

    onRouteChange?.(routeId);
    requestAnimationFrame(() => stage.classList.remove("is-transitioning"));
  };

  window.addEventListener("hashchange", render);
  render();

  return () => {
    window.removeEventListener("hashchange", render);
    if (activeController) activeController.abort();
    if (activeCleanup) activeCleanup();
  };
}