import DotMatrix from "https://umerhammaz.github.io/Orbs-by-Umer-Hamaaz/src/dot-matrix.js";

class OrbBackground extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="./components/background/background.css">
      <div id="orb-stage" class="orb-stage"></div>
    `;

    new DotMatrix("#orb-stage", {
      shape: "blackhole",
      color: "0, 0, 0",
      colorMode: "depth",
      bg: "transparent",
      depthSort: true,
      motion: "still",
      initialRotation: [-2.9618, -0.3047, 0]
    });
  }
}

customElements.define("orb-background", OrbBackground);