import {
  prefersReducedMotion,
  triggerTactileFeedback
} from "../../js/tactile.js";

const SECTIONS = [
  { text: "Get Started", href: "#get-started" },
  { text: "Features", href: "#features" },
  { text: "Pricing", href: "#pricing" },
  { text: "Docs", href: "#docs" }
];

const SQUISH_DURATION_MS = 150;
const SLIDE_OUT_MS = 150;
const SLIDE_IN_MS = 250;
const DOCK_SCROLL_THRESHOLD_PX = 40;
const DOCK_PROBE_Y_PX = 52;

export function initNavDialer(dialer, button, btnText, header) {
  let currentIndex = 0;
  let isAnimating = false;
  let scrollRafId = null;

  const updateBtn = (direction) => {
    if (isAnimating) return;
    isAnimating = true;

    triggerTactileFeedback("detent");

    button.classList.add("is-squished");
    setTimeout(() => button.classList.remove("is-squished"), SQUISH_DURATION_MS);

    const animOut = direction > 0 ? "slideOutUp" : "slideOutDown";
    const animIn = direction > 0 ? "slideInUp" : "slideInDown";

    btnText.style.animation = `${animOut} ${SLIDE_OUT_MS}ms ease-in forwards`;

    setTimeout(() => {
      currentIndex = (currentIndex + direction + SECTIONS.length) % SECTIONS.length;
      btnText.textContent = SECTIONS[currentIndex].text;
      button.href = SECTIONS[currentIndex].href;

      btnText.style.animation = `${animIn} ${SLIDE_IN_MS}ms cubic-bezier(0.25, 1, 0.5, 1) forwards`;

      setTimeout(() => {
        isAnimating = false;
        btnText.style.animation = "none";
      }, SLIDE_IN_MS);
    }, SLIDE_OUT_MS);
  };

  const onWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      updateBtn(1);
    } else if (e.deltaY < 0) {
      updateBtn(-1);
    }
  };

  const onButtonClick = (e) => {
    const href = button.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start"
    });
  };

  const syncHeaderDock = () => {
    scrollRafId = null;
    if (!header) return;

    const shouldDock = window.scrollY > DOCK_SCROLL_THRESHOLD_PX;
    header.classList.toggle("is-docked", shouldDock);

    if (!shouldDock) {
      header.classList.remove("is-on-dark");
      return;
    }

    const darkPlates = document.querySelectorAll('[data-plate-theme="dark"]');
    let overDark = false;
    for (let i = 0; i < darkPlates.length; i++) {
      const rect = darkPlates[i].getBoundingClientRect();
      if (rect.top <= DOCK_PROBE_Y_PX && rect.bottom >= DOCK_PROBE_Y_PX) {
        overDark = true;
        break;
      }
    }
    header.classList.toggle("is-on-dark", overDark);
  };

  const scheduleHeaderSync = () => {
    if (scrollRafId === null) {
      scrollRafId = requestAnimationFrame(syncHeaderDock);
    }
  };

  dialer.addEventListener("wheel", onWheel, { passive: false });
  button.addEventListener("click", onButtonClick);
  window.addEventListener("scroll", scheduleHeaderSync, { passive: true });
  window.addEventListener("resize", scheduleHeaderSync, { passive: true });
  syncHeaderDock();

  return () => {
    dialer.removeEventListener("wheel", onWheel);
    button.removeEventListener("click", onButtonClick);
    window.removeEventListener("scroll", scheduleHeaderSync);
    window.removeEventListener("resize", scheduleHeaderSync);
    if (scrollRafId !== null) {
      cancelAnimationFrame(scrollRafId);
    }
  };
}