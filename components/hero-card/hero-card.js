import { initDotLens } from "./dot-lens.js";

class HeroCard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/hero-card/hero-card.css">
      <section class="hero-card">
        <canvas class="hero-bg-canvas"></canvas>
        <header class="hero-header">
          <nav class="header-pill">
            <img class="pill-logo" src="https://worker.github-ji.pages.dev/zerocommit.svg" alt="ZeroCommit Logo">
            <a href="#get-started" class="pill-btn">Get Started</a>
          </nav>
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
  }

  disconnectedCallback() {
    if (this.cleanup) this.cleanup();
  }
}

customElements.define("hero-card", HeroCard);