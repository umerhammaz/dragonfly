class ScreenRelief extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/screen-relief/screen-relief.css">
      <section class="screen-relief-card">
        <header class="relief-header">
          <span class="relief-tag">Real-World Math</span>
          <span style="font-size:14px; opacity:0.8;">ZeroCommit / Benchmark</span>
        </header>

        <div class="relief-body">
          <div class="relief-title-group">
            <h2 class="relief-title">Click "Detect Stage" and take a sip of tea.</h2>
            <p class="relief-subtitle">Hard comparison of modifying 30 files across an active codebase:</p>
          </div>

          <div class="matrix-grid">
            <div class="matrix-card">
              <div>
                <div class="matrix-header">
                  <span class="matrix-title">Autonomous Agents</span>
                  <span class="matrix-tag red">Slow & Costly</span>
                </div>
                <div class="stat-number">14+ Mins</div>
                <p class="stat-desc">Repeatedly re-reads your repository 4 times. Burns ~120,000 tokens per bug fix ($4.50+ API cost).</p>
              </div>
              <span style="font-size:11px; opacity:0.6;">Tool call loops & timeout risks</span>
            </div>

            <div class="matrix-card">
              <div>
                <div class="matrix-header">
                  <span class="matrix-title">Manual Ctrl+F</span>
                  <span class="matrix-tag amber">Exhausting</span>
                </div>
                <div class="stat-number">45+ Mins</div>
                <p class="stat-desc">30 open editor tabs. 6 search-and-replace queries per file. One indentation mistake breaks the build.</p>
              </div>
              <span style="font-size:11px; opacity:0.6;">High cognitive strain</span>
            </div>

            <div class="matrix-card winner">
              <div>
                <div class="matrix-header">
                  <span class="matrix-title">ZeroCommit Studio</span>
                  <span class="matrix-tag green">1-Shot Precision</span>
                </div>
                <div class="stat-number">1.8 Secs</div>
                <p class="stat-desc">Copy AI chat response. Hit Detect Stage. All 30 files are surgically verified and updated in place.</p>
              </div>
              <span style="font-size:11px; font-weight:700;">$0 API token cost · Zero setup</span>
            </div>
          </div>
        </div>

        <footer class="relief-footer">
          <span>Client-side parsing with browser File System Access.</span>
          <span>Zero middleman servers. Zero token leakage.</span>
        </footer>
      </section>
    `;
  }
}

customElements.define("screen-relief", ScreenRelief);