import { initMriCanvas } from "./mri-canvas.js";
import { initModeSwitch } from "./mode-switch.js";

const MODELS = ["CLAUDE", "CHATGPT", "GEMINI", "DEEPSEEK", "QWEN", "GLM"];

class ThesisPlate extends HTMLElement {
  connectedCallback() {
    const modelItems = MODELS.map(
      (name) => `<span class="brain-index__item">${name}</span>`
    ).join("");

    this.innerHTML = `
      <link rel="stylesheet" href="./components/thesis-plate/thesis-plate.css">
      <section
        class="thesis-plate"
        data-plate-theme="dark"
        data-specimen-mode="agent"
        aria-labelledby="thesis-heading"
      >
        <div class="thesis-rail">
          <span class="thesis-rail__index">02 / THESIS</span>
          <span class="thesis-rail__center">BROWSER-NATIVE WORKSPACE · ZERO GIT · ZERO NODE</span>
          <span class="thesis-rail__status">
            <span class="thesis-rail__dot" aria-hidden="true"></span>
            <span class="thesis-rail__mode">BLIND AGENT</span>
          </span>
        </div>

        <div class="thesis-grid">
          <div class="thesis-manifesto">
            <div class="thesis-manifesto__top">
              <p class="thesis-eyebrow">MANUAL TRANSMISSION · POWER STEERING</p>
              <h2 id="thesis-heading" class="thesis-title">
                <span class="thesis-title__primary">Precision surgery.</span>
                <span class="thesis-title__secondary">Not blind autopilot.</span>
              </h2>
              <p class="thesis-copy">
                Autonomous agents crawl blindly through hundreds of files, burning tokens into Context Rot while rewriting architecture behind your back. ZeroCommit maps your entire repository first, isolates the exact files your LLM needs, and applies multi-file edits cleanly inside your browser.
              </p>
            </div>

            <div class="brain-index">
              <span class="brain-index__label">BRING YOUR OWN BRAIN · ZERO VENDOR LOCK-IN</span>
              <div class="brain-index__list" aria-label="Supported language models">
                ${modelItems}
              </div>
              <p class="brain-index__note">Works with any Web LLM — including free tiers.</p>
            </div>
          </div>

          <div class="mri-chamber">
            <div class="mri-bar">
              <span class="mri-bar__meta">SPECIMEN · 312 FILES · TASK: FIX AUTH SESSION</span>
              <div class="mode-switch-wrap">
                <span class="mode-switch__hint" aria-hidden="true">CLICK OR SCROLL</span>
                <div
                  class="mode-switch"
                  role="radiogroup"
                  aria-label="Workflow comparison mode"
                  data-active="agent"
                >
                  <span class="mode-switch__thumb" aria-hidden="true"></span>
                  <button
                    type="button"
                    class="mode-switch__btn"
                    role="radio"
                    aria-checked="true"
                    data-mode="agent"
                  >
                    <span class="mode-switch__num">01</span>
                    <span>BLIND AGENT</span>
                  </button>
                  <button
                    type="button"
                    class="mode-switch__btn"
                    role="radio"
                    aria-checked="false"
                    data-mode="zerocommit"
                    tabindex="-1"
                  >
                    <span class="mode-switch__num">02</span>
                    <span>ZEROCOMMIT</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="mri-stage">
              <span class="mri-crosshair mri-crosshair--tl" aria-hidden="true">+</span>
              <span class="mri-crosshair mri-crosshair--tr" aria-hidden="true">+</span>
              <span class="mri-crosshair mri-crosshair--bl" aria-hidden="true">+</span>
              <span class="mri-crosshair mri-crosshair--br" aria-hidden="true">+</span>

              <canvas class="mri-canvas" aria-hidden="true"></canvas>

              <div class="mri-hud mri-hud--top">
                <span class="mri-hud__status">TRAVERSING REPO · CONTEXT ROT RISING</span>
              </div>
              <div class="mri-hud mri-hud--bottom">
                <span class="mri-hud__coords">RETICLE: STANDBY</span>
              </div>
            </div>

            <div class="mri-telemetry" aria-live="polite">
              <div class="telemetry-cell">
                <span class="telemetry-cell__label">FILES READ</span>
                <span class="telemetry-cell__mask">
                  <span class="telemetry-cell__val" data-metric="files">14 / 312</span>
                </span>
                <span class="telemetry-cell__delta" data-delta="files">BLIND SCAN</span>
              </div>
              <div class="telemetry-cell">
                <span class="telemetry-cell__label">TOKENS</span>
                <span class="telemetry-cell__mask">
                  <span class="telemetry-cell__val" data-metric="tokens">14,200</span>
                </span>
                <span class="telemetry-cell__delta" data-delta="tokens">BURNING</span>
              </div>
              <div class="telemetry-cell">
                <span class="telemetry-cell__label">CLARITY</span>
                <span class="telemetry-cell__mask">
                  <span class="telemetry-cell__val" data-metric="clarity">92%</span>
                </span>
                <span class="telemetry-cell__delta" data-delta="clarity">CONTEXT ROT</span>
              </div>
              <div class="telemetry-cell">
                <span class="telemetry-cell__label">CONTROL</span>
                <span class="telemetry-cell__mask">
                  <span class="telemetry-cell__val" data-metric="control">AUTOPILOT</span>
                </span>
                <span class="telemetry-cell__delta" data-delta="control">HANDS OFF</span>
              </div>
            </div>
          </div>
        </div>

        <footer class="thesis-ledger">
          <article class="ledger-item">
            <span class="ledger-item__index">01 / ZERO SETUP</span>
            <p class="ledger-item__body">
              <strong>Browser-native from line one.</strong> No Git binaries, no Node.js runtimes, no terminal permission errors. Open a tab, connect GitHub, and ship.
            </p>
          </article>
          <article class="ledger-item">
            <span class="ledger-item__index">02 / ZERO MIDDLEMAN TAX</span>
            <p class="ledger-item__body">
              <strong>Model-agnostic by design.</strong> Pair with whichever LLM leads today. When a sharper, cheaper model arrives tomorrow, switch with zero lock-in.
            </p>
          </article>
          <article class="ledger-item">
            <span class="ledger-item__index">03 / PILOT IN COMMAND</span>
            <p class="ledger-item__body">
              <strong>Manual transmission with power steering.</strong> AI drafts surgical diffs; ZeroCommit stages, scans for secrets, stacks Turns, and commits only on your signal.
            </p>
          </article>
        </footer>
      </section>
    `;

    const plate = this.querySelector(".thesis-plate");
    const stage = this.querySelector(".mri-stage");
    const canvas = this.querySelector(".mri-canvas");
    const coordsEl = this.querySelector(".mri-hud__coords");

    let switchController = null;

    this.mriController = initMriCanvas(canvas, stage, {
      onTelemetry: (data) => {
        if (switchController) {
          switchController.updateLiveTelemetry(data);
        }
      },
      onPointer: ({ active, x, y }) => {
        if (!coordsEl) return;
        if (!active) {
          coordsEl.textContent = "RETICLE: STANDBY";
          return;
        }
        const px = String(x).padStart(3, "0");
        const py = String(y).padStart(3, "0");
        coordsEl.textContent = `X: ${px} · Y: ${py}`;
      }
    });

    switchController = initModeSwitch(
      {
        plate,
        switchEl: this.querySelector(".mode-switch"),
        buttons: Array.from(this.querySelectorAll(".mode-switch__btn")),
        railModeTag: this.querySelector(".thesis-rail__mode"),
        stageStatusEl: this.querySelector(".mri-hud__status"),
        telemetry: {
          filesVal: this.querySelector('[data-metric="files"]'),
          filesDelta: this.querySelector('[data-delta="files"]'),
          tokensVal: this.querySelector('[data-metric="tokens"]'),
          tokensDelta: this.querySelector('[data-delta="tokens"]'),
          clarityVal: this.querySelector('[data-metric="clarity"]'),
          clarityDelta: this.querySelector('[data-delta="clarity"]'),
          controlVal: this.querySelector('[data-metric="control"]'),
          controlDelta: this.querySelector('[data-delta="control"]')
        }
      },
      this.mriController
    );

    this.switchController = switchController;
  }

  disconnectedCallback() {
    if (this.switchController) {
      this.switchController.destroy();
    }
    if (this.mriController) {
      this.mriController.destroy();
    }
  }
}

customElements.define("thesis-plate", ThesisPlate);