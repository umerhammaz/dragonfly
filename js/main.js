import { initDotLens } from "./dot-lens.js";
import { initNavDialer } from "./nav-dialer.js";
import { DEFAULT_ROUTE, NAV_SECTIONS, initRouter } from "./router.js";

const frame = document.querySelector(".app-frame");
const canvas = document.querySelector(".app-bg-canvas");
const cursor = document.querySelector(".app-cursor");
const stage = document.getElementById("screen-stage");
const btn = document.querySelector(".pill-btn");
const btnText = document.querySelector(".pill-btn__text");
const dialer = document.querySelector(".nav-dialer");

initDotLens(canvas, frame, cursor);

const nav = initNavDialer(dialer, btn, btnText, NAV_SECTIONS, DEFAULT_ROUTE);

initRouter(stage, {
  onRouteChange: (routeId) => nav.sync(routeId)
});