const SECTIONS = [
  { id: "get-started", label: "Get Started" },
  { id: "pricing", label: "Pricing" },
  { id: "docs", label: "Docs" },
  { id: "changelog", label: "Changelog" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" }
];

const STORAGE_KEY = "nav-oracle.selected";
const WHEEL_DETENT_MS = 130;
const SWIPE_STEP_PX = 26;
const HANDLED_KEYS = new Set(["ArrowUp", "ArrowDown", "Enter", " ", "Escape"]);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode); selection just won't persist
  }
};

const retrigger = (el, cls) => {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
};

class NavOracle extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/nav-oracle/nav-oracle.css">
      <div class="nav-oracle" role="button" tabindex="0" aria-label="Section menu">
        <div class="oracle-glyph" aria-hidden="true">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </div>
        <div class="oracle-window" aria-live="polite">
          <span class="oracle-label"></span>
          <span class="oracle-ghost" aria-hidden="true"></span>
        </div>
        <span class="oracle-pin" aria-hidden="true"></span>
      </div>
    `;

    this.rootEl = this.querySelector(".nav-oracle");
    this.labelEl = this.querySelector(".oracle-label");
    this.ghostEl = this.querySelector(".oracle-ghost");
    this.index = 0;
    this.committed = -1;
    this.lastNotch = 0;
    this.touchY = 0;
    this.touchMoved = false;

    const savedId = safeGet(STORAGE_KEY);
    const savedIndex = SECTIONS.findIndex((section) => section.id === savedId);
    if (savedIndex >= 0) {
      this.index = savedIndex;
      this.committed = savedIndex;
      this.rootEl.classList.add("has-selection");
    }
    this.renderLabel(false);

    this.onEnter = () => this.open();
    this.onLeave = () => this.close();
    this.onWheel = (e) => this.handleWheel(e);
    this.onClick = () => this.handleClick();
    this.onKeyDown = (e) => this.handleKey(e);
    this.onTouchStart = (e) => {
      this.touchY = e.touches[0].clientY;
      this.touchMoved = false;
    };
    this.onTouchMove = (e) => this.handleTouchMove(e);

    this.rootEl.addEventListener("pointerenter", this.onEnter);
    this.rootEl.addEventListener("pointerleave", this.onLeave);
    this.rootEl.addEventListener("focus", this.onEnter);
    this.rootEl.addEventListener("blur", this.onLeave);
    this.rootEl.addEventListener("wheel", this.onWheel, { passive: false });
    this.rootEl.addEventListener("click", this.onClick);
    this.rootEl.addEventListener("keydown", this.onKeyDown);
    this.rootEl.addEventListener("touchstart", this.onTouchStart, { passive: true });
    this.rootEl.addEventListener("touchmove", this.onTouchMove, { passive: false });
  }

  disconnectedCallback() {
    this.rootEl.removeEventListener("pointerenter", this.onEnter);
    this.rootEl.removeEventListener("pointerleave", this.onLeave);
    this.rootEl.removeEventListener("focus", this.onEnter);
    this.rootEl.removeEventListener("blur", this.onLeave);
    this.rootEl.removeEventListener("wheel", this.onWheel);
    this.rootEl.removeEventListener("click", this.onClick);
    this.rootEl.removeEventListener("keydown", this.onKeyDown);
    this.rootEl.removeEventListener("touchstart", this.onTouchStart);
    this.rootEl.removeEventListener("touchmove", this.onTouchMove);
  }

  open() {
    this.rootEl.classList.add("is-open");
  }

  close() {
    this.rootEl.classList.remove("is-open");
    if (this.committed >= 0 && this.index !== this.committed) {
      this.index = this.committed;
      this.renderLabel(true);
    }
  }

  step(delta) {
    const next = (this.index + delta + SECTIONS.length) % SECTIONS.length;
    if (next === this.index) return;
    this.index = next;
    this.renderLabel(true);
  }

  renderLabel(animate) {
    const { label } = SECTIONS[this.index];
    if (!animate || prefersReducedMotion()) {
      this.labelEl.textContent = label;
      this.ghostEl.textContent = "";
      return;
    }
    this.ghostEl.textContent = this.labelEl.textContent;
    retrigger(this.ghostEl, "roll-out");
    this.labelEl.textContent = label;
    this.animateLabel("roll-in");
  }

  animateLabel(cls) {
    this.labelEl.classList.remove("roll-in", "lock-pulse");
    void this.labelEl.offsetWidth;
    this.labelEl.classList.add(cls);
  }

  select() {
    this.committed = this.index;
    safeSet(STORAGE_KEY, SECTIONS[this.committed].id);
    this.rootEl.classList.add("has-selection");
    this.animateLabel("lock-pulse");
    retrigger(this.rootEl, "is-locked");
    const target = document.getElementById(SECTIONS[this.committed].id);
    if (target) {
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start"
      });
    }
  }

  handleClick() {
    if (this.touchMoved) {
      this.touchMoved = false;
      return;
    }
    this.select();
  }

  handleWheel(e) {
    if (!this.rootEl.classList.contains("is-open")) return;
    e.preventDefault();
    const now = performance.now();
    if (now - this.lastNotch < WHEEL_DETENT_MS) return;
    this.lastNotch = now;
    this.step(e.deltaY > 0 ? 1 : -1);
  }

  handleKey(e) {
    if (!HANDLED_KEYS.has(e.key)) return;
    e.preventDefault();
    if (e.key === "ArrowDown") this.step(1);
    else if (e.key === "ArrowUp") this.step(-1);
    else if (e.key === "Escape") this.close();
    else this.select();
  }

  handleTouchMove(e) {
    const y = e.touches[0].clientY;
    const delta = this.touchY - y;
    if (Math.abs(delta) < SWIPE_STEP_PX) return;
    e.preventDefault();
    this.touchMoved = true;
    this.touchY = y;
    this.open();
    this.step(delta > 0 ? 1 : -1);
  }
}

customElements.define("nav-oracle", NavOracle);