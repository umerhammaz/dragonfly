const SECTIONS = [
  { text: "Get Started", href: "#get-started" },
  { text: "Features", href: "#features" },
  { text: "Pricing", href: "#pricing" },
  { text: "Docs", href: "#docs" }
];

export function initNavDialer(dialer, button, btnText) {
  let currentIndex = 0;
  let isAnimating = false;
  let audioCtx = null;

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
    
    button.classList.add("is-squished");
    setTimeout(() => button.classList.remove("is-squished"), 150);

    const animOut = direction > 0 ? "slideOutUp" : "slideOutDown";
    const animIn = direction > 0 ? "slideInUp" : "slideInDown";

    btnText.style.animation = `${animOut} 0.15s ease-in forwards`;

    setTimeout(() => {
      currentIndex = (currentIndex + direction + SECTIONS.length) % SECTIONS.length;
      btnText.textContent = SECTIONS[currentIndex].text;
      button.href = SECTIONS[currentIndex].href;

      btnText.style.animation = `${animIn} 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards`;

      setTimeout(() => {
        isAnimating = false;
        btnText.style.animation = "none";
      }, 250);
    }, 150);
  };

  const onWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      updateBtn(1);
    } else if (e.deltaY < 0) {
      updateBtn(-1);
    }
  };

  dialer.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    dialer.removeEventListener("wheel", onWheel);
    if (audioCtx) audioCtx.close();
  };
}