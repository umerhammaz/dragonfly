class ScreenAgony extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/screen-agony/screen-agony.css">
      <section class="screen-agony-card">
        <header class="agony-header">
          <span class="agony-pill-tag">The Bottleneck</span>
          <span class="agony-brand">ZeroCommit / Paradox</span>
        </header>

        <div class="agony-body">
          <div class="agony-typography">
            <h2 class="agony-title-sans">Prompting AI takes 5 seconds.</h2>
            <h3 class="agony-title-serif">Applying changes across 40 files is manual labor.</h3>
          </div>

          <div class="agony-grid">
            <div class="agony-narrative">
              <div class="agony-point-card">
                <span class="point-label">Nested File Traversal</span>
                <p class="point-desc">Free AI models return search-and-replace blocks, leaving you to manually locate files 6 directories deep.</p>
              </div>
              <div class="agony-point-card">
                <span class="point-label">The Ctrl+F Repetition Loop</span>
                <p class="point-desc">Finding line 412, copying replace blocks, checking tabs, and repeating 6 to 8 times per file across 30 files.</p>
              </div>
              <div class="agony-point-card">
                <span class="point-label">Autonomous Agent Lag</span>
                <p class="point-desc">Terminal agents re-read entire repos 4 times over, burning 120,000 tokens and 15 minutes per fix.</p>
              </div>
            </div>

            <div class="agony-visual-window">
              <div class="window-bar">
                <span>src/js/modules/auth/tokens/session-refresh.ts</span>
                <span>Active File</span>
              </div>
              <div class="mock-search-box">
                <span>Ctrl+F: line 384 [Replace Snippet]</span>
                <span class="search-status">Match 1 of 8</span>
              </div>
              <div class="mock-file-tree">
                <div>├── src/js/routes/api.ts (2 replacements pending)</div>
                <div>├── src/js/utils/jwt-signer.ts (4 replacements pending)</div>
                <div>├── src/js/controllers/auth.ts (6 replacements pending)</div>
                <div class="tree-alert">└── 27 more files waiting in queue...</div>
              </div>
            </div>
          </div>
        </div>

        <footer class="agony-footer">
          <span>You didn't become an engineer to be an AI copy-paste robot.</span>
          <span class="token-warning">Agent token tax: ~120,000 / run</span>
        </footer>
      </section>
    `;
  }
}

customElements.define("screen-agony", ScreenAgony);