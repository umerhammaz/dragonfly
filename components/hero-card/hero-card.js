class HeroCard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/hero-card/hero-card.css">
      <section class="hero-card">
        <canvas class="hero-bg-canvas"></canvas>
        <header class="hero-header">
          <nav class="header-pill">
            <img class="pill-logo" src="https://worker.github-ji.pages.dev/zerocommit.svg" alt="ZeroCommit Logo">
            <a href="#get-started" class="pill-btn">Get Started</a>
          </nav>
        </header>
        <div class="hero-body">
          <div class="typography-group">
            <span class="subtitle">Introducing</span>
            <h1 class="title">ZeroCommit v1</h1>
          </div>
        </div>
      </section>
    `;

    this.initWarpGrid();
  }

  disconnectedCallback() {
    if (this.cleanup) this.cleanup();
  }

  initWarpGrid() {
    const card = this.querySelector(".hero-card");
    const canvas = this.querySelector(".hero-bg-canvas");
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = null;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let hasPointer = false;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = card.clientWidth;
      height = card.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!hasPointer) {
        targetX = width * 0.5;
        targetY = height * 0.45;
        curX = targetX;
        curY = targetY;
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(card);
    resize();

    const onPointerMove = (e) => {
      const rect = card.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      hasPointer = true;
    };

    const onPointerLeave = () => {
      hasPointer = false;
      targetX = width * 0.5;
      targetY = height * 0.45;
    };

    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerleave", onPointerLeave);

    const GRID_STEP = 42;
    const SAMPLE_STEP = 20;
    const RADIUS = 300;
    const RADIUS_SQ = RADIUS * RADIUS;
    const MAX_PULL = 78;

    const warpPoint = (x, y) => {
      const dx = x - curX;
      const dy = y - curY;

      if (dx > RADIUS || dx < -RADIUS || dy > RADIUS || dy < -RADIUS) {
        return [x, y];
      }

      const d2 = dx * dx + dy * dy;
      if (d2 >= RADIUS_SQ || d2 === 0) return [x, y];

      const d = Math.sqrt(d2);
      const t = 1 - d / RADIUS;
      const pull = t * t * (3 - 2 * t) * MAX_PULL;

      return [x - (dx / d) * pull, y - (dy / d) * pull];
    };

    const render = () => {
      curX += (targetX - curX) * 0.32;
      curY += (targetY - curY) * 0.32;

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
      ctx.lineWidth = 1;

      for (let y = GRID_STEP; y < height; y += GRID_STEP) {
        ctx.beginPath();
        let first = true;
        for (let x = 0; x <= width + SAMPLE_STEP; x += SAMPLE_STEP) {
          const [wx, wy] = warpPoint(Math.min(x, width), y);
          if (first) {
            ctx.moveTo(wx, wy);
            first = false;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
      }

      for (let x = GRID_STEP; x < width; x += GRID_STEP) {
        ctx.beginPath();
        let first = true;
        for (let y = 0; y <= height + SAMPLE_STEP; y += SAMPLE_STEP) {
          const [wx, wy] = warpPoint(x, Math.min(y, height));
          if (first) {
            ctx.moveTo(wx, wy);
            first = false;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
      }

      const aura = ctx.createRadialGradient(curX, curY, 8, curX, curY, 40);
      aura.addColorStop(0, "rgba(59, 130, 246, 0.28)");
      aura.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(curX, curY, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(59, 130, 246, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curX, curY, 13, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#09090b";
      ctx.beginPath();
      ctx.arc(curX, curY, 8, 0, Math.PI * 2);
      ctx.fill();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    this.cleanup = () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerleave", onPointerLeave);
    };
  }
}

customElements.define("hero-card", HeroCard);