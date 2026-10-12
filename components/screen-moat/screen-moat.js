class ScreenMoat extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/screen-moat/screen-moat.css">
      <section class="screen-moat-card">
        <header class="moat-header">
          <span class="moat-tag">Engine Moat</span>
          <span style="font-weight:700; font-size:14px;">The 6-Node Architecture</span>
        </header>

        <div class="moat-body">
          <div class="moat-title-group">
            <h2 class="moat-title">
              What makes <span class="moat-title-serif">ZeroCommit different?</span>
            </h2>
            <p style="font-size:18px; color:#4b5563; margin-top:8px;">
              It solves the input context and the output surgery—without running an expensive LLM middleman.
            </p>
          </div>

          <div class="bento-grid">
            <div class="bento-card">
              <span class="bento-num">NODE 01</span>
              <h3 class="bento-heading">Deep Map Indexer</h3>
              <p class="bento-text">Extracts function hierarchies and dependencies for million-token repos so AI selects only needed files.</p>
            </div>
            <div class="bento-card">
              <span class="bento-num">NODE 02</span>
              <h3 class="bento-heading">1-Shot Repo Bundler</h3>
              <p class="bento-text">Compresses 200+ project files into a single structured prompt ready for any free AI chat window.</p>
            </div>
            <div class="bento-card">
              <span class="bento-num">NODE 03</span>
              <h3 class="bento-heading">Fuzzy Block Parser</h3>
              <p class="bento-text">Resistant to AI whitespace changes, line ending differences, and indentation drift without failing.</p>
            </div>
            <div class="bento-card">
              <span class="bento-num">NODE 04</span>
              <h3 class="bento-heading">Deep Path Resolver</h3>
              <p class="bento-text">Automatically maps relative paths even when the LLM omits deep parent directories.</p>
            </div>
            <div class="bento-card">
              <span class="bento-num">NODE 05</span>
              <h3 class="bento-heading">0-Token Local Engine</h3>
              <p class="bento-text">All diff parsing and file updates execute locally in your browser memory. $0 API token costs.</p>
            </div>
            <div class="bento-card">
              <span class="bento-num">NODE 06</span>
              <h3 class="bento-heading">Multi-File Batch Stage</h3>
              <p class="bento-text">Surgically modifies 14 to 40+ files concurrently in under two seconds with complete rollback safety.</p>
            </div>
          </div>
        </div>

        <footer class="moat-footer">
          <span>Engineered for real-world projects with deep directory hierarchies.</span>
          <span>Zero cloud dependency</span>
        </footer>
      </section>
    `;
  }
}

customElements.define("screen-moat", ScreenMoat);