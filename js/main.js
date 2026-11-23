import "../components/site-hud/site-hud.js";
import "../components/artifact-bay/artifact-bay.js";
import "../components/hero-card/hero-card.js";
import "../components/thesis-screen/thesis-screen.js";
import { initCinemaController } from "./cinema-controller.js";
import { initCinemaTransition } from "./cinema-transition.js";

const boot = () => {
  initCinemaController();
  initCinemaTransition();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
