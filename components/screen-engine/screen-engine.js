class ScreenEngine extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/screen-engine/screen-engine.css">
      <section class="screen-engine-card">
        <header class="engine-header">
          <div class="engine-steps">
            <span class="step-pill ochre">01 · Deep Map</span>
            <span class="step-pill violet">02 · Paste AI Output</span>
            <span class="step-pill emerald">03 · Detect & Stage</span>
          </div>
          <span style="font-weight:700; font-size:14px;">ZeroCommit Pipeline</span>
        </header>

        <div class="engine-body">
          <div class="engine-title-group">
            <h2 class="engine-title">Zero agent lag. Zero manual Ctrl+F.</h2>
            <p class="engine-subtitle">Feed your codebase to any free LLM interface. Copy the raw output, click Detect Stage, and 40 files update instantly.</p>
          </div>

          <div class="pipeline-split">
            <div class="pipeline-card">
              <div class="pipeline-card-label">
                <span>Raw AI Response</span>
                <span>Claude / DeepSeek</span>
              </div>
              <div class="pipeline-code-block">
&lt;&lt;&lt;&lt; SEARCH [src/auth.ts]<br>
export function getSession(req) {<br>
&nbsp;&nbsp;return req.cookies.token;<br>
}<br>
====<br>
export function getSession(req) {<br>
&nbsp;&nbsp;return verifyBearer(req.headers);<br>
}<br>
&gt;&gt;&gt;&gt;
              </div>
            </div>

            <div class="pipeline-divider">
              <div class="pipeline-arrow">→</div>
              <span>1.8s</span>
            </div>

            <div class="pipeline-card">
              <div class="pipeline-card-label">
                <span>Surgical Staging Queue</span>
                <span>40 Files Matched</span>
              </div>
              <div class="staged-list">
                <div class="staged-item">
                  <span>src/auth.ts (2 replacements)</span>
                  <span class="badge-staged">STAGED ✓</span>
                </div>
                <div class="staged-item">
                  <span>components/dot-lens.js (1 replacement)</span>
                  <span class="badge-staged">STAGED ✓</span>
                </div>
                <div class="staged-item">
                  <span>api/routes/user.py (4 replacements)</span>
                  <span class="badge-staged">STAGED ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="engine-footer">
          <span>Compatible with free web ChatGPT, Claude, DeepSeek, Qwen, and GLM.</span>
          <span>Runs 100% locally in browser memory</span>
        </footer>
      </section>
    `;
  }
}

customElements.define("screen-engine", ScreenEngine);