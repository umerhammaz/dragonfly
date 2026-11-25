import { CURSOR_NUDGE_EVENT } from "./cursor.js";

export function initNavDialer(dialer, button, btnText, sections, defaultRoute) {
  let currentIndex = 0;
  let isAnimating = false;
  let audioCtx = null;

  const applySection = (index) => {
    currentIndex = index;
    btnText.textContent = sections[currentIndex].text;
    button.href = sections[currentIndex].href;
  };

  applySection(0);

  const playTick = () => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
      // Silently fail if audio context is blocked
    }
  };

  const triggerHaptics = () => {
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const updateBtn = (direction) => {
    if (isAnimating) return;
    isAnimating = true;

    playTick();
    triggerHaptics();
    dialer.dispatchEvent(new CustomEvent(CURSOR_NUDGE_EVENT, { bubbles: true, detail: direction }));
    
    button.classList.add("is-squished");
    setTimeout(() => button.classList.remove("is-squished"), 150);

    const animOut = direction > 0 ? "slideOutUp" : "slideOutDown";
    const animIn = direction > 0 ? "slideInUp" : "slideInDown";

    btnText.style.animation = `${animOut} 0.15s ease-in forwards`;

    setTimeout(() => {
      applySection((currentIndex + direction + sections.length) % sections.length);

      btnText.style.animation = `${animIn} 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards`;

      setTimeout(() => {
        isAnimating = false;
        btnText.style.animation = "none";
      }, 250);
    }, 150);
  };

  const sync = (routeId) => {
    if (isAnimating) return;
    if (routeId === defaultRoute) {
      applySection(0);
      return;
    }
    const idx = sections.findIndex((item) => item.id === routeId);
    if (idx !== -1) applySection(idx);
  };

  const onWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY > 0) {
      updateBtn(1);
    } else if (e.deltaY < 0) {
      updateBtn(-1);
    }
  };

  dialer.addEventListener("wheel", onWheel, { passive: false });

  return {
    sync,
    destroy: () => {
      dialer.removeEventListener("wheel", onWheel);
      if (audioCtx) audioCtx.close();
    }
  };
}