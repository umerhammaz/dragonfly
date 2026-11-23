import "../components/site-hud/site-hud.js";
import "../components/artifact-bay/artifact-bay.js";
import "../components/hero-card/hero-card.js";
import "../components/thesis-screen/thesis-screen.js";
import { initCinemaController } from "./cinema-controller.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCinemaController, { once: true });
} else {
  initCinemaController();
}