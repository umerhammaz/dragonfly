import { prefersReducedMotion } from "../../js/tactile.js";

const TOTAL_REPO_FILES = 312;
const DESKTOP_NODE_COUNT = 312;
const COMPACT_NODE_COUNT = 156;
const COMPACT_BREAKPOINT_PX = 560;
const MAX_DPR = 1.5;

const AGENT_STEP_MS = 85;
const AGENT_MAX_READS = 247;
const AGENT_MAX_TOKENS = 148600;
const AGENT_TRAIL_LIMIT = 38;

const ZC_FILES_READ = 3;
const ZC_TOKENS_USED = 3420;
const ZC_CLARITY_PCT = 99.4;

const MRI_SWEEP_MS = 580;
const POINTER_LENS_RADIUS = 135;
const POINTER_LENS_RADIUS_SQ = POINTER_LENS_RADIUS * POINTER_LENS_RADIUS;
const SEED_BASE = 133791;

const CLUSTERS = [
  { id: "ui", cx: 0.17, cy: 0.26, rx: 0.11, ry: 0.14, weight: 0.18 },
  { id: "auth", cx: 0.5, cy: 0.29, rx: 0.15, ry: 0.15, weight: 0.15 },
  { id: "api", cx: 0.82, cy: 0.26, rx: 0.11, ry: 0.14, weight: 0.17 },
  { id: "core", cx: 0.19, cy: 0.72, rx: 0.12, ry: 0.14, weight: 0.18 },
  { id: "engine", cx: 0.52, cy: 0.74, rx: 0.14, ry: 0.14, weight: 0.17 },
  { id: "vault", cx: 0.82, cy: 0.72, rx: 0.11, ry: 0.14, weight: 0.15 }
];

const TARGET_SPECS = [
  {
    label: "auth.controller.ts",
    nx: 0.37,
    ny: 0.34,
    tagDx: -8,
    tagDy: -28,
    align: "center"
  },
  {
    label: "session.guard.ts",
    nx: 0.55,
    ny: 0.48,
    tagDx: 18,
    tagDy: -8,
    align: "left"
  },
  {
    label: "token.store.ts",
    nx: 0.43,
    ny: 0.63,
    tagDx: 18,
    tagDy: 10,
    align: "left"
  }
];

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initMriCanvas(canvas, container, callbacks = {}) {
  const ctx = canvas.getContext("2d");
  const { onTelemetry, onPointer } = callbacks;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let running = false;
  let isVisible = true;
  let mode = "agent";
  let reducedMotion = prefersReducedMotion();

  let nodes = [];
  let edges = [];
  let targetIndices = [];

  // Blind Agent state
  let visitedFlags = [];
  let visitedCount = 0;
  let agentReads = 0;
  let agentLastStep = 0;
  let agentCursorIdx = 0;
  let agentTrails = [];
  let rotLevel = 0;

  // ZeroCommit MRI state
  let sweepStart = 0;
  let lockStarted = false;

  // Pointer optical reticle state
  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = false;

  const buildGraph = () => {
    const rand = createSeededRandom(SEED_BASE);
    const totalNodes =
      width < COMPACT_BREAKPOINT_PX ? COMPACT_NODE_COUNT : DESKTOP_NODE_COUNT;
    const regularCount = totalNodes - TARGET_SPECS.length;

    nodes = [];
    edges = [];
    targetIndices = [];

    const padX = Math.max(24, width * 0.06);
    const padY = Math.max(28, height * 0.11);
    const spanX = Math.max(1, width - padX * 2);
    const spanY = Math.max(1, height - padY * 2);

    let assigned = 0;
    for (let c = 0; c < CLUSTERS.length; c++) {
      const cluster = CLUSTERS[c];
      const count =
        c === CLUSTERS.length - 1
          ? regularCount - assigned
          : Math.round(regularCount * cluster.weight);

      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = Math.sqrt(rand());
        const nx = Math.min(
          0.97,
          Math.max(0.03, cluster.cx + Math.cos(angle) * radius * cluster.rx)
        );
        const ny = Math.min(
          0.94,
          Math.max(0.06, cluster.cy + Math.sin(angle) * radius * cluster.ry)
        );

        nodes.push({
          x: padX + nx * spanX,
          y: padY + ny * spanY,
          cluster: c,
          isTarget: false,
          phase: rand() * Math.PI * 2,
          driftX: (rand() - 0.5) * 3.8,
          driftY: (rand() - 0.5) * 3.8
        });
      }
      assigned += count;
    }

    for (let t = 0; t < TARGET_SPECS.length; t++) {
      const spec = TARGET_SPECS[t];
      const idx = nodes.length;
      targetIndices.push(idx);
      nodes.push({
        x: padX + spec.nx * spanX,
        y: padY + spec.ny * spanY,
        cluster: 1,
        isTarget: true,
        spec,
        phase: t * 1.4,
        driftX: 0,
        driftY: 0
      });
    }

    // Connect nearby intra-cluster neighbors for subtle architectural wireframe
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].isTarget) continue;
      let nearest = -1;
      let nearestD2 = Infinity;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].isTarget || nodes[j].cluster !== nodes[i].cluster) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearestD2 && d2 < 2400) {
          nearestD2 = d2;
          nearest = j;
        }
      }
      if (nearest !== -1) {
        edges.push({ a: i, b: nearest, surgical: false });
      }
    }

    // Surgical dependency chain linking the 3 exact target modules
    edges.push({ a: targetIndices[0], b: targetIndices[1], surgical: true });
    edges.push({ a: targetIndices[1], b: targetIndices[2], surgical: true });

    visitedFlags = new Uint8Array(nodes.length);
  };

  const resetAgentRun = (now) => {
    visitedFlags = new Uint8Array(nodes.length);
    visitedCount = 0;
    agentReads = reducedMotion ? AGENT_MAX_READS : 14;
    agentLastStep = now;
    agentCursorIdx = 0;
    agentTrails = [];
    rotLevel = reducedMotion ? 1 : 0.08;

    if (reducedMotion) {
      const step = Math.max(1, Math.floor(nodes.length / 90));
      for (let i = 0; i < nodes.length; i += step) {
        visitedFlags[i] = 1;
        if (agentTrails.length < AGENT_TRAIL_LIMIT && i + step < nodes.length) {
          agentTrails.push({ from: i, to: i + step, born: now });
        }
      }
      visitedCount = nodes.length;
    }

    emitTelemetry();
  };

  const emitTelemetry = () => {
    if (!onTelemetry) return;
    if (mode === "zerocommit") {
      onTelemetry({
        mode: "zerocommit",
        filesRead: ZC_FILES_READ,
        totalFiles: TOTAL_REPO_FILES,
        tokens: ZC_TOKENS_USED,
        clarity: ZC_CLARITY_PCT
      });
      return;
    }

    const ratio = Math.min(1, agentReads / AGENT_MAX_READS);
    const tokens = Math.round(14200 + ratio * (AGENT_MAX_TOKENS - 14200));
    const clarity = Math.max(19, Math.round(92 - ratio * 73));
    onTelemetry({
      mode: "agent",
      filesRead: Math.min(AGENT_MAX_READS, Math.round(agentReads)),
      totalFiles: TOTAL_REPO_FILES,
      tokens,
      clarity
    });
  };

  const stop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    running = false;
  };

  const start = () => {
    if (!running && isVisible) {
      running = true;
      rafId = requestAnimationFrame(render);
    }
  };

  const stepAgent = (now) => {
    if (now - agentLastStep < AGENT_STEP_MS) return;
    agentLastStep = now;

    const hops = agentReads < AGENT_MAX_READS ? 3 : 1;
    for (let h = 0; h < hops; h++) {
      const prevIdx = agentCursorIdx;
      const nextIdx = Math.floor(Math.random() * nodes.length);
      agentCursorIdx = nextIdx;

      if (!visitedFlags[nextIdx]) {
        visitedFlags[nextIdx] = 1;
        visitedCount++;
      }

      agentTrails.push({ from: prevIdx, to: nextIdx, born: now });
      if (agentTrails.length > AGENT_TRAIL_LIMIT) {
        agentTrails.shift();
      }
    }

    if (agentReads < AGENT_MAX_READS) {
      const scale = TOTAL_REPO_FILES / Math.max(1, nodes.length);
      agentReads = Math.min(
        AGENT_MAX_READS,
        Math.max(agentReads + 2.4, visitedCount * scale)
      );
    }
    rotLevel = Math.min(1, agentReads / AGENT_MAX_READS);
    emitTelemetry();
  };

  const drawAgentFrame = (now) => {
    if (!reducedMotion) {
      stepAgent(now);
    }

    // Tangled background filaments degraded by rot
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + rotLevel * 0.03})`;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (e.surgical) continue;
      const a = nodes[e.a];
      const b = nodes[e.b];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // Chaotic criss-crossing read trails
    for (let i = 0; i < agentTrails.length; i++) {
      const trail = agentTrails[i];
      const age = reducedMotion ? 0.35 : (now - trail.born) / 2200;
      const alpha = Math.max(0.03, (1 - age) * 0.26);
      const a = nodes[trail.from];
      const b = nodes[trail.to];
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Nodes drifting slightly off-grid as Context Rot builds
    const rotTime = now * 0.004;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const visited = visitedFlags[i] === 1;
      const jitter = visited ? rotLevel * 1.6 : 0;
      const nx = n.x + (jitter ? Math.sin(rotTime + n.phase) * jitter + n.driftX * rotLevel * 0.35 : 0);
      const ny = n.y + (jitter ? Math.cos(rotTime + n.phase) * jitter + n.driftY * rotLevel * 0.35 : 0);

      if (visited) {
        const hazeAlpha = Math.max(0.16, 0.42 - rotLevel * 0.14);
        ctx.fillStyle = `rgba(255, 255, 255, ${hazeAlpha})`;
        ctx.beginPath();
        ctx.arc(nx, ny, 2.2 + rotLevel * 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.13)";
        ctx.beginPath();
        ctx.arc(nx, ny, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Active blind scanner head
    if (nodes[agentCursorIdx]) {
      const head = nodes[agentCursorIdx];
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle monochrome rot vignette fog at high token burn
    if (rotLevel > 0.3) {
      const fogAlpha = (rotLevel - 0.3) * 0.16;
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.1,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.6
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${fogAlpha * 0.6})`);
      grad.addColorStop(1, "rgba(5, 5, 5, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  };

  const drawTargetTag = (node, alpha) => {
    if (alpha <= 0.02 || !node.spec) return;
    const { label, tagDx, tagDy, align } = node.spec;

    ctx.save();
    ctx.font = '500 10.5px "Geist Mono", ui-monospace, monospace';
    const textW = ctx.measureText(label).width;
    const padX = 7;
    const boxH = 20;
    const boxW = textW + padX * 2;

    let bx = node.x + tagDx;
    if (align === "center") {
      bx -= boxW * 0.5;
    }
    let by = node.y + tagDy - boxH * 0.5;

    // Keep tag cleanly inside viewport bounds
    bx = Math.max(10, Math.min(width - boxW - 10, bx));
    by = Math.max(10, Math.min(height - boxH - 10, by));

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(5, 5, 5, 0.92)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
    ctx.lineWidth = 1;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + padX, by + boxH * 0.5 + 0.5);
    ctx.restore();
  };

  const drawZeroCommitFrame = (now) => {
    const elapsed = reducedMotion ? MRI_SWEEP_MS + 400 : now - sweepStart;
    const sweepRatio = Math.min(1, elapsed / MRI_SWEEP_MS);
    const sweepY = sweepRatio * height;
    const sweepActive = !reducedMotion && sweepRatio < 1;

    // Calm structural filaments illuminated cleanly as scanline passes
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (e.surgical) continue;
      const a = nodes[e.a];
      const b = nodes[e.b];
      const midY = (a.y + b.y) * 0.5;

      let alpha = 0.04;
      if (sweepActive) {
        const distToBeam = Math.abs(midY - sweepY);
        if (distToBeam < 70) {
          alpha = 0.04 + (1 - distToBeam / 70) * 0.2;
        }
      }
      if (pointerActive) {
        const dx = (a.x + b.x) * 0.5 - pointerX;
        const dy = midY - pointerY;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_LENS_RADIUS_SQ) {
          const proximity = 1 - Math.sqrt(d2) / POINTER_LENS_RADIUS;
          alpha = Math.max(alpha, 0.06 + proximity * 0.22);
        }
      }

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // 309 skipped files recede peacefully into disciplined grid silence
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.isTarget) continue;

      let alpha = 0.11;
      let radius = 1.25;

      if (sweepActive) {
        const distToBeam = Math.abs(n.y - sweepY);
        if (distToBeam < 55) {
          const flash = 1 - distToBeam / 55;
          alpha += flash * 0.38;
          radius += flash * 0.7;
        }
      }

      if (pointerActive) {
        const dx = n.x - pointerX;
        const dy = n.y - pointerY;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_LENS_RADIUS_SQ) {
          const proximity = 1 - Math.sqrt(d2) / POINTER_LENS_RADIUS;
          alpha = Math.max(alpha, 0.14 + proximity * 0.44);
          radius += proximity * 0.8;
        }
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Surgical dependency edges linking the 3 isolated target nodes
    const pulsePhase = reducedMotion ? 0.5 : (now * 0.0014) % 1;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (!e.surgical) continue;
      const a = nodes[e.a];
      const b = nodes[e.b];
      const triggerY = Math.max(a.y, b.y);
      const lockAlpha = sweepActive
        ? Math.min(1, Math.max(0, (sweepY - triggerY + 30) / 70))
        : 1;

      if (lockAlpha <= 0.02) continue;

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.78 * lockAlpha})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Traveling signal bead along surgical vector
      if (!reducedMotion && lockAlpha > 0.8) {
        const bx = a.x + (b.x - a.x) * pulsePhase;
        const by = a.y + (b.y - a.y) * pulsePhase;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Locked target nodes + precision reticle rings + labels
    const breath = reducedMotion ? 0 : Math.sin(now * 0.004) * 1.1;
    for (let t = 0; t < targetIndices.length; t++) {
      const node = nodes[targetIndices[t]];
      const lockProgress = sweepActive
        ? Math.min(1, Math.max(0, (sweepY - node.y + 24) / 64))
        : 1;

      if (lockProgress <= 0.02) continue;

      const ringR = 14 + (1 - lockProgress) * 12 + breath * 0.4;

      // Outer broken reticle ring
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.88 * lockProgress})`;
      ctx.lineWidth = 1.1;
      for (let q = 0; q < 4; q++) {
        const startA = q * (Math.PI * 0.5) + 0.24;
        const endA = (q + 1) * (Math.PI * 0.5) - 0.24;
        ctx.beginPath();
        ctx.arc(node.x, node.y, ringR, startA, endA);
        ctx.stroke();
      }

      // Crosshair calibration ticks
      const tickIn = ringR - 3;
      const tickOut = ringR + 4;
      ctx.beginPath();
      ctx.moveTo(node.x - tickOut, node.y);
      ctx.lineTo(node.x - tickIn, node.y);
      ctx.moveTo(node.x + tickIn, node.y);
      ctx.lineTo(node.x + tickOut, node.y);
      ctx.moveTo(node.x, node.y - tickOut);
      ctx.lineTo(node.x, node.y - tickIn);
      ctx.moveTo(node.x, node.y + tickIn);
      ctx.lineTo(node.x, node.y + tickOut);
      ctx.stroke();

      // Solid white surgical core
      ctx.fillStyle = `rgba(255, 255, 255, ${lockProgress})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 3.6, 0, Math.PI * 2);
      ctx.fill();

      drawTargetTag(node, lockProgress);
    }

    // Horizontal MRI scanline beam
    if (sweepActive) {
      const wakeGrad = ctx.createLinearGradient(0, sweepY - 56, 0, sweepY);
      wakeGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      wakeGrad.addColorStop(1, "rgba(255, 255, 255, 0.14)");
      ctx.fillStyle = wakeGrad;
      ctx.fillRect(0, sweepY - 56, width, 56);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(width, sweepY);
      ctx.stroke();
    }

    // Precision optical pointer reticle
    if (pointerActive) {
      const gap = 5;
      const arm = 13;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pointerX - arm, pointerY);
      ctx.lineTo(pointerX - gap, pointerY);
      ctx.moveTo(pointerX + gap, pointerY);
      ctx.lineTo(pointerX + arm, pointerY);
      ctx.moveTo(pointerX, pointerY - arm);
      ctx.lineTo(pointerX, pointerY - gap);
      ctx.moveTo(pointerX, pointerY + gap);
      ctx.lineTo(pointerX, pointerY + arm);
      ctx.stroke();
    }
  };

  const render = (now) => {
    ctx.clearRect(0, 0, width, height);

    if (mode === "agent") {
      drawAgentFrame(now);
    } else {
      drawZeroCommitFrame(now);
    }

    if (reducedMotion) {
      running = false;
      rafId = null;
      return;
    }

    if (isVisible) {
      rafId = requestAnimationFrame(render);
    } else {
      running = false;
      rafId = null;
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = container.clientWidth;
    height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildGraph();
    if (mode === "agent") {
      resetAgentRun(performance.now());
    } else {
      emitTelemetry();
    }

    if (reducedMotion) {
      render(performance.now());
    } else {
      start();
    }
  };

  const setMode = (nextMode) => {
    if (nextMode !== "agent" && nextMode !== "zerocommit") return;
    mode = nextMode;
    const now = performance.now();

    if (mode === "agent") {
      resetAgentRun(now);
    } else {
      sweepStart = now;
      lockStarted = true;
      emitTelemetry();
    }

    if (reducedMotion) {
      render(now);
    } else {
      start();
    }
  };

  const onPointerMove = (e) => {
    const rect = container.getBoundingClientRect();
    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;
    pointerActive = true;
    if (onPointer) {
      onPointer({
        active: true,
        x: Math.max(0, Math.round(pointerX)),
        y: Math.max(0, Math.round(pointerY))
      });
    }
    if (reducedMotion) {
      render(performance.now());
    }
  };

  const onPointerLeave = () => {
    pointerActive = false;
    if (onPointer) {
      onPointer({ active: false, x: 0, y: 0 });
    }
    if (reducedMotion) {
      render(performance.now());
    }
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      isVisible = Boolean(entry && entry.isIntersecting);
      if (isVisible) {
        if (reducedMotion) {
          render(performance.now());
        } else {
          start();
        }
      } else {
        stop();
      }
    },
    { threshold: 0.01 }
  );
  intersectionObserver.observe(container);

  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerleave", onPointerLeave);

  resize();

  return {
    setMode,
    getMode: () => mode,
    hasLocked: () => lockStarted,
    destroy: () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
    }
  };
}