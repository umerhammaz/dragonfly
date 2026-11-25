import { initCursor } from "./cursor.js";
import { initDotLens } from "./dot-lens.js";
import { initNavDialer } from "./nav-dialer.js";
import { DEFAULT_ROUTE, NAV_SECTIONS, initRouter } from "./router.js";

const frame = document.querySelector(".app-frame");
const canvas = document.querySelector(".app-bg-canvas");
const cursorEl = document.querySelector(".app-cursor");
const stage = document.getElementById("screen-stage");
const btn = document.querySelector(".pill-btn");
const btnText = document.querySelector(".pill-btn__text");
const dialer = document.querySelector(".nav-dialer");

const cursor = initCursor(frame, cursorEl, stage);
const dotLens = initDotLens(canvas, frame);
const nav = initNavDialer(dialer, btn, btnText, NAV_SECTIONS, DEFAULT_ROUTE);

initRouter(stage, {
  onRouteChange: (routeId) => {
    nav.sync(routeId);
    cursor.refresh();
  }
});

let rafId = 0;

const tick = (now) => {
  cursor.step(now);
  dotLens.render(cursor.state);
  rafId = requestAnimationFrame(tick);
};

const syncVisibility = () => {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    cursor.reset();
    return;
  }
  if (!rafId) {
    cursor.resetClock();
    rafId = requestAnimationFrame(tick);
  }
};

document.addEventListener("visibilitychange", syncVisibility);
syncVisibility();