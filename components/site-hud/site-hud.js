import { initNavDialer } from "./nav-dialer.js";
import {
  CINEMA_NAVIGATE_EVENT,
  CINEMA_SCREEN_CHANGE_EVENT
} from "../../js/cinema-controller.js";

const formatFrameIndex = (value) => String(value).padStart(2, "0");

class SiteHud extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/site-hud/site-hud.css">
      <div class="site-hud" data-theme="light">
        <header class="hero-header">
          <nav class="header-pill" aria-label="Primary navigation">
            <a href="#hero" class="pill-logo-link" aria-label="ZeroCommit Home">
              <img class="pill-logo" src="/zerocommit.svg" alt="ZeroCommit Logo">
            </a>
            <a href="#hero" class="pill-btn">
              <span class="pill-btn__mask">
                <span class="pill-btn__text">Get Started</span>
              </span>
            </a>
          </nav>
          <div class="nav-dialer" role="button" tabindex="0" aria-label="Scroll or click to cycle navigation">
            <div class="nav-dialer__label">SCROLL</div>
            <div class="nav-dialer__track">
              <span class="nav-dialer__chevron top"></span>
              <div class="nav-dialer__dot"></div>
              <span class="nav-dialer__chevron bottom"></span>
            </div>
          </div>
        </header>
        <div class="hud-telemetry" aria-hidden="true">
          <span class="hud-scroll-cue">SCROLL ↓</span>
          <span class="hud-counter">01 / 02</span>
        </div>
      </div>
    `;

    const hudEl = this.querySelector(".site-hud");
    const logoLink = this.querySelector(".pill-logo-link");
    const btn = this.querySelector(".pill-btn");
    const btnText = this.querySelector(".pill-btn__text");
    const dialer = this.querySelector(".nav-dialer");
    const counterEl = this.querySelector(".hud-counter");
    const scrollCueEl = this.querySelector(".hud-scroll-cue");

    this.dialerApi = initNavDialer(dialer, btn, btnText);

    this.onLogoClick = (event) => {
      event.preventDefault();
      window.dispatchEvent(
        new CustomEvent(CINEMA_NAVIGATE_EVENT, { detail: { href: "#hero" } })
      );
    };

    this.onScreenChange = (event) => {
      const { index, total, id, theme } = event.detail;
      hudEl.dataset.theme = theme || "light";
      counterEl.textContent = `${formatFrameIndex(index + 1)} / ${formatFrameIndex(total)}`;
      scrollCueEl.classList.toggle("is-hidden", index > 0);
      if (id) {
        this.dialerApi.syncToHref(`#${id}`);
      }
    };

    logoLink.addEventListener("click", this.onLogoClick);
    window.addEventListener(CINEMA_SCREEN_CHANGE_EVENT, this.onScreenChange);
  }

  disconnectedCallback() {
    const logoLink = this.querySelector(".pill-logo-link");
    if (logoLink && this.onLogoClick) {
      logoLink.removeEventListener("click", this.onLogoClick);
    }
    if (this.onScreenChange) {
      window.removeEventListener(CINEMA_SCREEN_CHANGE_EVENT, this.onScreenChange);
    }
    if (this.dialerApi) {
      this.dialerApi.cleanup();
    }
  }
}

customElements.define("site-hud", SiteHud);