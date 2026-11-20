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
            <a href="#get-started" class="pill-btn">
              <span class="pill-btn__mask">
                <span class="pill-btn__text">Get Started</span>
              </span>
            </a>
          </nav>
          <div class="pill-nav-trigger" aria-label="Scroll to navigate">
            <span></span>
            <span></span>
            <span></span>
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
    const trigger = this.querySelector(".pill-nav-trigger");
    
    const sections = [
      { text: "Get Started", href: "#get-started" },
      { text: "Features", href: "#features" },
      { text: "Pricing", href: "#pricing" },
      { text: "Docs", href: "#docs" }
    ];
    let currentIndex = 0;
    let isAnimating = false;

    const updateBtn = (direction) => {
      if (isAnimating) return;
      isAnimating = true;

      const animOut = direction > 0 ? "slideOutUp" : "slideOutDown";
      const animIn = direction > 0 ? "slideInUp" : "slideInDown";

      btnText.style.animation = `${animOut} 0.15s ease-in forwards`;

      setTimeout(() => {
        currentIndex = (currentIndex + direction + sections.length) % sections.length;
        btnText.textContent = sections[currentIndex].text;
        btn.href = sections[currentIndex].href;

        btnText.style.animation = `${animIn} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`;

        setTimeout(() => {
          isAnimating = false;
          btnText.style.animation = "none";
        }, 300);
      }, 150);
    };

    const onWheel = (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        updateBtn(1);
      } else if (e.deltaY < 0) {
        updateBtn(-1);
      }
    };

    trigger.addEventListener("wheel", onWheel, { passive: false });
    
    this.triggerCleanup = () => {
      trigger.removeEventListener("wheel", onWheel);
    };
  }

  disconnectedCallback() {
    if (this.cleanup) this.cleanup();
    if (this.triggerCleanup) this.triggerCleanup();
  }
}

customElements.define("hero-card", HeroCard);