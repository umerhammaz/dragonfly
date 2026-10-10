class HeroCard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/hero-card/hero-card.css">
      <section class="hero-card">
        <header class="hero-header">
          <div class="badge">
            <img class="badge-logo" src="https://worker.github-ji.pages.dev/zerocommit.svg" alt="ZeroCommit Logo">
          </div>
        </header>
        <div class="hero-body">
          <div class="typography-group">
            <span class="subtitle">Introducing</span>
            <h1 class="title">ZeroCommit v1</h1>
          </div>
          <a href="#get-started" class="cta-btn">Get Started</a>
        </div>
      </section>
    `;
  }
}

customElements.define("hero-card", HeroCard);