export const CINEMA_SCREEN_CHANGE_EVENT = "cinema:screen-change";
export const CINEMA_NAVIGATE_EVENT = "cinema:navigate";

const VISIBILITY_THRESHOLDS = [0.15, 0.35, 0.55, 0.75];
const REVEAL_RATIO = 0.2;

export function initCinemaController() {
  const frame = document.querySelector(".cinema-frame");
  const stage = document.querySelector(".cinema-stage");
  if (!frame || !stage) return () => {};

  const screens = Array.from(stage.querySelectorAll("[data-screen]"));
  if (!screens.length) return () => {};

  const ratios = new Map(screens.map((el) => [el, 0]));
  let activeIndex = -1;

  const activateScreen = (index) => {
    if (index === activeIndex || index < 0 || index >= screens.length) return;
    activeIndex = index;

    const screen = screens[index];
    const theme = screen.dataset.theme || "light";
    frame.dataset.activeTheme = theme;

    window.dispatchEvent(
      new CustomEvent(CINEMA_SCREEN_CHANGE_EVENT, {
        detail: {
          index,
          total: screens.length,
          id: screen.id || "",
          theme,
          label: screen.dataset.label || ""
        }
      })
    );
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        if (entry.intersectionRatio >= REVEAL_RATIO) {
          entry.target.classList.add("is-in-view");
        }
      }

      let bestIndex = activeIndex < 0 ? 0 : activeIndex;
      let bestRatio = -1;

      screens.forEach((screen, idx) => {
        const ratio = ratios.get(screen) || 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestIndex = idx;
        }
      });

      if (bestRatio > 0) {
        activateScreen(bestIndex);
      }
    },
    {
      root: stage,
      threshold: VISIBILITY_THRESHOLDS
    }
  );

  screens.forEach((screen) => observer.observe(screen));
  screens[0].classList.add("is-in-view");
  activateScreen(0);

  const onNavigate = (event) => {
    const href = event.detail && event.detail.href;
    if (!href || !href.startsWith("#")) return;

    const target = stage.querySelector(href);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.addEventListener(CINEMA_NAVIGATE_EVENT, onNavigate);

  return () => {
    observer.disconnect();
    window.removeEventListener(CINEMA_NAVIGATE_EVENT, onNavigate);
  };
}
