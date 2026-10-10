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

    this.initDotMatrixLens();
  }

  disconnectedCallback() {
    if (this.cleanup) this.cleanup();
  }

  initDotMatrixLens() {
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

    const STEP = 28;
    const RADIUS = 190;
    const RADIUS_SQ = RADIUS * RADIUS;

    const render = () => {
      curX += (targetX - curX) * 0.24;
      curY += (targetY - curY) * 0.24;

      ctx.clearRect(0, 0, width, height);

      for (let x = STEP * 0.5; x < width; x += STEP) {
        for (let y = STEP * 0.5; y < height; y += STEP) {
          const dx = x - curX;
          const dy = y - curY;
          const d2 = dx * dx + dy * dy;

          let px = x;
          let py = y;
          let size = 1.1;
          let color = "rgba(15, 23, 42, 0.1)";

          if (d2 < RADIUS_SQ) {
            const d = Math.sqrt(d2);
            const pull = Math.exp(-d2 / (2 * 58 * 58)) * 0.58;
            px = curX + dx * (1 - pull);
            py = curY + dy * (1 - pull);

            const proximity = 1 - d / RADIUS;
            size = 1.1 + proximity * 0.9;
            const alpha = 0.1 + proximity * 0.42;

            color = proximity > 0.45
              ? `rgba(59, 130, 246, ${alpha})`
              : `rgba(15, 23, 42, ${alpha})`;
          }

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(curX, curY, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#09090b";
      ctx.beginPath();
      ctx.arc(curX, curY, 3, 0, Math.PI * 2);
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