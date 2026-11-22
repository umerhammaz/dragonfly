import {
  prefersReducedMotion,
  triggerTactileFeedback
} from "../../js/tactile.js";

const AUTO_REVEAL_DELAY_MS = 2300;
const WHEEL_COOLDOWN_MS = 240;
const ROLL_DURATION_MS = 260;

const MODE_ORDER = ["agent", "zerocommit"];

export function initModeSwitch(elements, mriController) {
  const {
    plate,
    switchEl,
    buttons,
    railModeTag,
    stageStatusEl,
    telemetry
  } = elements;

  let currentMode = prefersReducedMotion() ? "zerocommit" : "agent";
  let userInteracted = false;
  let autoRevealTimer = null;
  let autoRevealTriggered = false;
  let lastWheelTime = 0;

  const formatNumber = (num) => num.toLocaleString("en-US");

  const triggerRoll = (el, direction) => {
    if (!el || prefersReducedMotion()) return;
    const animName = direction > 0 ? "thesisRollUp" : "thesisRollDown";
    el.style.animation = "none";
    // Force reflow so rapid switches replay the mechanical roll cleanly
    void el.offsetWidth;
    el.style.animation = `${animName} ${ROLL_DURATION_MS}ms var(--ease-detent) forwards`;
  };

  const paintTelemetry = (data, animateRoll = false, direction = 1) => {
    const isZc = data.mode === "zerocommit";

    telemetry.filesVal.textContent = `${data.filesRead} / ${data.totalFiles}`;
    telemetry.filesDelta.textContent = isZc ? "99.0% SKIPPED" : "BLIND SCAN";

    telemetry.tokensVal.textContent = formatNumber(data.tokens);
    telemetry.tokensDelta.textContent = isZc ? "-97.7% SAVED" : "BURNING";

    telemetry.clarityVal.textContent = isZc ? `${data.clarity}%` : `${data.clarity}%`;
    telemetry.clarityDelta.textContent = isZc ? "SURGICAL LOCK" : "CONTEXT ROT";

    telemetry.controlVal.textContent = isZc ? "PILOT" : "AUTOPILOT";
    telemetry.controlDelta.textContent = isZc ? "IN COMMAND" : "HANDS OFF";

    if (animateRoll) {
      triggerRoll(telemetry.filesVal, direction);
      triggerRoll(telemetry.tokensVal, direction);
      triggerRoll(telemetry.clarityVal, direction);
      triggerRoll(telemetry.controlVal, direction);
    }
  };

  const applyMode = (nextMode, { tactile = false, animate = true } = {}) => {
    if (nextMode !== "agent" && nextMode !== "zerocommit") return;
    const prevIdx = MODE_ORDER.indexOf(currentMode);
    const nextIdx = MODE_ORDER.indexOf(nextMode);
    const direction = nextIdx >= prevIdx ? 1 : -1;

    currentMode = nextMode;
    switchEl.dataset.active = nextMode;
    plate.dataset.specimenMode = nextMode;

    buttons.forEach((btn) => {
      const isSelected = btn.dataset.mode === nextMode;
      btn.setAttribute("aria-checked", String(isSelected));
      btn.tabIndex = isSelected ? 0 : -1;
    });

    if (railModeTag) {
      railModeTag.textContent =
        nextMode === "zerocommit" ? "SURGICAL MRI" : "BLIND AGENT";
    }

    if (stageStatusEl) {
      stageStatusEl.textContent =
        nextMode === "zerocommit"
          ? "DEEPMAP INDEXED · 3 TARGETS LOCKED"
          : "TRAVERSING REPO · CONTEXT ROT RISING";
    }

    if (tactile) {
      triggerTactileFeedback(nextMode === "zerocommit" ? "lock" : "chaos");
      switchEl.classList.add("is-squished");
      setTimeout(() => switchEl.classList.remove("is-squished"), 140);
    }

    mriController.setMode(nextMode);

    if (animate) {
      paintTelemetry(
        nextMode === "zerocommit"
          ? {
              mode: "zerocommit",
              filesRead: 3,
              totalFiles: 312,
              tokens: 3420,
              clarity: 99.4
            }
          : {
              mode: "agent",
              filesRead: 14,
              totalFiles: 312,
              tokens: 14200,
              clarity: 92
            },
        true,
        direction
      );
    }
  };

  const selectByUser = (nextMode) => {
    userInteracted = true;
    if (autoRevealTimer !== null) {
      clearTimeout(autoRevealTimer);
      autoRevealTimer = null;
    }
    if (nextMode === currentMode) return;
    applyMode(nextMode, { tactile: true, animate: true });
  };

  const onButtonClick = (e) => {
    const targetMode = e.currentTarget.dataset.mode;
    selectByUser(targetMode);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      selectByUser("zerocommit");
      buttons[1].focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectByUser("agent");
      buttons[0].focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const toggled = currentMode === "agent" ? "zerocommit" : "agent";
      selectByUser(toggled);
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheelTime < WHEEL_COOLDOWN_MS) return;
    lastWheelTime = now;
    if (e.deltaY > 0) {
      selectByUser("zerocommit");
    } else if (e.deltaY < 0) {
      selectByUser("agent");
    }
  };

  buttons.forEach((btn) => btn.addEventListener("click", onButtonClick));
  switchEl.addEventListener("keydown", onKeyDown);
  switchEl.addEventListener("wheel", onWheel, { passive: false });

  // One-time choreographed transition from Blind Agent -> ZeroCommit when first seen
  const revealObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (
        !entry ||
        !entry.isIntersecting ||
        autoRevealTriggered ||
        userInteracted ||
        prefersReducedMotion()
      ) {
        return;
      }
      autoRevealTriggered = true;
      autoRevealTimer = setTimeout(() => {
        autoRevealTimer = null;
        if (!userInteracted && currentMode === "agent") {
          applyMode("zerocommit", { tactile: false, animate: true });
        }
      }, AUTO_REVEAL_DELAY_MS);
    },
    { threshold: 0.35 }
  );
  revealObserver.observe(plate);

  applyMode(currentMode, { tactile: false, animate: false });

  return {
    updateLiveTelemetry: (data) => paintTelemetry(data, false),
    destroy: () => {
      if (autoRevealTimer !== null) {
        clearTimeout(autoRevealTimer);
      }
      revealObserver.disconnect();
      buttons.forEach((btn) => btn.removeEventListener("click", onButtonClick));
      switchEl.removeEventListener("keydown", onKeyDown);
      switchEl.removeEventListener("wheel", onWheel);
    }
  };
}