import { initDotLens } from "./dot-lens.js";
import { initNavDialer } from "./nav-dialer.js";

class HeroCard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/hero-card/hero-card.css">
      <section class="hero-card">
        <canvas class="hero-bg-canvas"></canvas>
        <header class="hero-header">
          <nav class="header-pill">
            <img class="pill-logo" src="/zerocommit.svg" alt="ZeroCommit Logo">
            <a href="#get-started" class="pill-btn">
              <span class="pill-btn__mask">
                <span class="pill-btn__text">Get Started</span>
              </span>
            </a>
          </nav>
          <div class="nav-dialer" aria-label="Scroll to navigate">
            <div class="nav-dialer__label">SCROLL</div>
            <div class="nav-dialer__track">
              <span class="nav-dialer__chevron top"></span>
              <div class="nav-dialer__dot"></div>
              <span class="nav-dialer__chevron bottom"></span>
            </div>
          </div>
        </header>
        <div class="hero-body">
          <div class="typography-group">
            <span class="subtitle">Introducing</span>
            <h1 class="title">ZeroCommit v1</h1>
          </div>
        </div>
      </section>
    `;

    const canvas = this.querySelector(".hero-bg-canvas");
    const card = this.querySelector(".hero-card");
    this.cleanup = initDotLens(canvas, card);

    const btn = this.querySelector(".pill-btn");
    const btnText = this.querySelector(".pill-btn__text");
    const dialer = this.querySelector(".nav-dialer");

    this.triggerCleanup = initNavDialer(dialer, btn, btnText);
  }

  disconnectedCallback() {
    if (this.cleanup) this.cleanup();
    if (this.triggerCleanup) this.triggerCleanup();
  }
}

customElements.define("hero-card", HeroCard);