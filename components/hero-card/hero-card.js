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

    this.initBlackHole();
  }

  disconnectedCallback() {
    if (this.cleanup) this.cleanup();
  }

  initBlackHole() {
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
      dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const PARTICLE_COUNT = 90;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 1.8 + 0.8,
      alpha: Math.random() * 0.45 + 0.15,
      tint: Math.random() > 0.4 ? "59, 130, 246" : "15, 23, 42"
    }));

    const render = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const gridSpacing = 42;
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      for (let gx = gridSpacing * 0.5; gx < width; gx += gridSpacing) {
        for (let gy = gridSpacing * 0.5; gy < height; gy += gridSpacing) {
          const dx = gx - curX;
          const dy = gy - curY;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist < 22) continue;

          const warp = Math.min(18, 480 / (dist + 24));
          const px = gx - (dx / dist) * warp;
          const py = gy - (dy / dist) * warp;

          ctx.beginPath();
          ctx.arc(px, py, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const horizon = 24;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = curX - p.x;
        const dy = curY - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < horizon) {
          p.x = Math.random() < 0.5 ? (Math.random() < 0.5 ? -10 : width + 10) : Math.random() * width;
          p.y = Math.random() < 0.5 ? (Math.random() < 0.5 ? -10 : height + 10) : Math.random() * height;
          p.vx = (Math.random() - 0.5) * 0.8;
          p.vy = (Math.random() - 0.5) * 0.8;
          continue;
        }

        const force = Math.min(2.4, 260 / (distSq + 240));
        const swirl = Math.min(1.8, 140 / (dist + 30));

        p.vx += (dx / dist) * force - (dy / dist) * swirl * 0.35;
        p.vy += (dy / dist) * force + (dx / dist) * swirl * 0.35;
        p.vx *= 0.94;
        p.vy *= 0.94;

        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = `rgba(${p.tint}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      const halo = ctx.createRadialGradient(curX, curY, horizon * 0.7, curX, curY, horizon * 2.8);
      halo.addColorStop(0, "rgba(59, 130, 246, 0.45)");
      halo.addColorStop(0.35, "rgba(59, 130, 246, 0.18)");
      halo.addColorStop(1, "rgba(59, 130, 246, 0)");

      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(curX, curY, horizon * 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(59, 130, 246, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curX, curY, horizon * 1.08, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(curX, curY, horizon, 0, Math.PI * 2);
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