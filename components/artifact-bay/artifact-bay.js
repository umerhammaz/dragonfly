import { initBlackHoleCanvas } from "./black-hole-canvas.js";

const MEDIA_TYPES = {
  CANVAS: "canvas",
  VIDEO: "video",
  IMAGE: "image"
};

class ArtifactBay extends HTMLElement {
  connectedCallback() {
    const type = this.getAttribute("type") || MEDIA_TYPES.CANVAS;
    const src = this.getAttribute("src") || "";
    const alt = this.getAttribute("alt") || "ZeroCommit visual artifact";
    const mode = this.getAttribute("mode") || "void";
    const surface = this.getAttribute("surface") || "dark";
    const caption = this.getAttribute("caption") || "";
    const poster = this.getAttribute("poster") || "";

    const mediaMarkup = this.buildMediaMarkup(type, src, alt, poster);
    const captionMarkup = caption
      ? `<figcaption class="artifact-bay__caption">${caption}</figcaption>`
      : "";

    this.innerHTML = `
      <link rel="stylesheet" href="./components/artifact-bay/artifact-bay.css">
      <figure class="artifact-bay" data-mode="${mode}" data-surface="${surface}">
        <div class="artifact-bay__stage">
          <span class="artifact-bay__crosshair artifact-bay__crosshair--tl" aria-hidden="true"></span>
          <span class="artifact-bay__crosshair artifact-bay__crosshair--tr" aria-hidden="true"></span>
          <span class="artifact-bay__crosshair artifact-bay__crosshair--bl" aria-hidden="true"></span>
          <span class="artifact-bay__crosshair artifact-bay__crosshair--br" aria-hidden="true"></span>
          ${mediaMarkup}
        </div>
        ${captionMarkup}
      </figure>
    `;

    const stage = this.querySelector(".artifact-bay__stage");

    if (type === MEDIA_TYPES.VIDEO && src) {
      this.bindVideoPlayback(this.querySelector("video"));
    } else if (type === MEDIA_TYPES.CANVAS || !src) {
      const canvas = this.querySelector("canvas");
      if (canvas && stage) {
        this.canvasCleanup = initBlackHoleCanvas(canvas, stage);
      }
    }
  }

  buildMediaMarkup(type, src, alt, poster) {
    if (type === MEDIA_TYPES.VIDEO && src) {
      const posterAttr = poster ? ` poster="${poster}"` : "";
      return `<video class="artifact-bay__media" src="${src}"${posterAttr} autoplay muted loop playsinline preload="metadata" aria-label="${alt}"></video>`;
    }

    if (type === MEDIA_TYPES.IMAGE && src) {
      return `<img class="artifact-bay__media" src="${src}" alt="${alt}" loading="lazy">`;
    }

    return `<canvas class="artifact-bay__media" aria-label="${alt}"></canvas>`;
  }

  bindVideoPlayback(video) {
    if (!video) return;

    this.videoObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    this.videoObserver.observe(video);
  }

  disconnectedCallback() {
    if (this.canvasCleanup) this.canvasCleanup();
    if (this.videoObserver) this.videoObserver.disconnect();
  }
}

customElements.define("artifact-bay", ArtifactBay);