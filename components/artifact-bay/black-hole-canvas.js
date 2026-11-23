const MAX_DPR = 1.5;
const PARTICLE_COUNT = 220;
const RING_COUNT = 5;
const TIME_SPEED = 0.00055;
const POINTER_EASE = 0.07;
const MAX_PARALLAX = 18;
const HORIZON_RATIO = 0.17;
const OUTER_ORBIT_RATIO = 0.44;
const PHOTON_GLOW_RATIO = 0.28;

function createParticles() {
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = i / PARTICLE_COUNT;
    particles.push({
      angle: t * Math.PI * 2 * 7,
      radiusNorm: HORIZON_RATIO + 0.03 + Math.pow(t, 1.35) * (OUTER_ORBIT_RATIO - HORIZON_RATIO),
      speed: 0.25 + (1 - t) * 1.15,
      size: 0.7 + (1 - t) * 1.35,
      alpha: 0.14 + (1 - t) * 0.68,
      eccentricity: 0.86 + (i % 7) * 0.025,
      tilt: ((i % 11) - 5) * 0.06
    });
  }
  return particles;
}

export function initBlackHoleCanvas(canvas, container) {
  const ctx = canvas.getContext("2d");
  const particles = createParticles();

  let size = 0;
  let dpr = 1;
  let rafId = null;
  let running = false;
  let isVisible = true;
  let targetOx = 0;
  let targetOy = 0;
  let curOx = 0;
  let curOy = 0;

  const start = () => {
    if (!running && isVisible) {
      running = true;
      rafId = requestAnimationFrame(render);
    }
  };

  const stop = () => {
    if (running) {
      running = false;
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    size = Math.min(container.clientWidth, container.clientHeight);
    canvas.width = Math.max(1, Math.floor(size * dpr));
    canvas.height = Math.max(1, Math.floor(size * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    start();
  };

  const onPointerMove = (event) => {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    targetOx = nx * MAX_PARALLAX;
    targetOy = ny * MAX_PARALLAX;
  };

  const onPointerLeave = () => {
    targetOx = 0;
    targetOy = 0;
  };

  const render = (now) => {
    if (!size) {
      rafId = requestAnimationFrame(render);
      return;
    }

    curOx += (targetOx - curOx) * POINTER_EASE;
    curOy += (targetOy - curOy) * POINTER_EASE;

    const time = now * TIME_SPEED;
    const cx = size * 0.5 + curOx * 0.35;
    const cy = size * 0.5 + curOy * 0.35;
    const horizonR = size * HORIZON_RATIO;
    const breath = Math.sin(time * 2.2) * 0.012;

    ctx.clearRect(0, 0, size, size);

    const halo = ctx.createRadialGradient(
      cx,
      cy,
      horizonR * 0.85,
      cx,
      cy,
      size * (PHOTON_GLOW_RATIO + breath)
    );
    halo.addColorStop(0, "rgba(255, 255, 255, 0.24)");
    halo.addColorStop(0.32, "rgba(215, 222, 232, 0.08)");
    halo.addColorStop(1, "rgba(9, 9, 11, 0)");

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
    ctx.fill();

    for (let r = 0; r < RING_COUNT; r++) {
      const progress = r / (RING_COUNT - 1);
      const radius = size * (HORIZON_RATIO + 0.045 + progress * 0.21);
      const rotation = time * (0.35 - progress * 0.16) + r * 0.55;
      ctx.save();
      ctx.translate(cx + curOx * (0.15 * progress), cy + curOy * (0.15 * progress));
      ctx.rotate(rotation);
      ctx.scale(1, 0.62 + progress * 0.28);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.14 - progress * 0.09})`;
      ctx.lineWidth = r === 0 ? 1.25 : 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const angle = p.angle + time * p.speed;
      const radius = size * p.radiusNorm;
      const x = cx + Math.cos(angle) * radius + curOx * 0.25;
      const y = cy + Math.sin(angle) * radius * p.eccentricity + Math.sin(angle * 2) * p.tilt * size * 0.1 + curOy * 0.25;

      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= horizonR * 1.01) continue;

      const shimmer = 0.78 + 0.22 * Math.sin(time * 4 + i);
      ctx.fillStyle = `rgba(255, 255, 255, ${(p.alpha * shimmer).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx, cy, horizonR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, horizonR + 0.75, 0, Math.PI * 2);
    ctx.stroke();

    rafId = requestAnimationFrame(render);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      isVisible = Boolean(entry && entry.isIntersecting);
      if (isVisible) {
        start();
      } else {
        stop();
      }
    },
    { threshold: 0.05 }
  );
  visibilityObserver.observe(container);

  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerleave", onPointerLeave);

  resize();

  return () => {
    stop();
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerleave", onPointerLeave);
  };
}
