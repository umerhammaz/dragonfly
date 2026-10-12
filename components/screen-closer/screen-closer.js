class ScreenCloser extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/screen-closer/screen-closer.css">
      <section class="screen-closer-card">
        <header class="closer-header">
          <span class="closer-pill-tag">Stop Manual Labor</span>
          <span style="font-size:14px; opacity:0.8;">ZeroCommit Web Studio</span>
        </header>

        <div class="closer-body">
          <h2 class="closer-title">Ready to stop editing 40 files by hand?</h2>

          <div class="closer-steps-ticker">
            <span class="ticker-item">1. Drop Repo</span>
            <span class="ticker-item">2. Prompt Free AI</span>
            <span class="ticker-item">3. Paste Raw Output</span>
            <span class="ticker-item">4. Hit Detect Stage</span>
          </div>

          <div class="closer-badge-metric">
            40 FILES PATCHED IN 1.8s · 0 TOKEN TAX ✓
          </div>

          <a href="#studio" class="closer-cta-btn">
            Open ZeroCommit Web Studio
          </a>

          <p style="font-size:14px; opacity:0.8; margin-top:-14px;">
            Web-based · No installation required · Direct folder staging
          </p>
        </div>

        <footer class="closer-footer">
          <span>Feed your repo to any free AI. Code is updated in seconds.</span>
          <span>ZeroCommit v1</span>
        </footer>
      </section>
    `;
  }
}

customElements.define("screen-closer", ScreenCloser);