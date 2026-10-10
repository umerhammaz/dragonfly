class AppHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/header/header.css">
      <header class="hero-header">
        <nav class="header-pill">
          <img class="pill-logo" src="https://worker.github-ji.pages.dev/zerocommit.svg" alt="ZeroCommit Logo">
          <a href="#get-started" class="pill-btn">Get Started</a>
        </nav>
      </header>
    `;
  }
}

customElements.define("app-header", AppHeader);