const DEFAULT_MEDIA = {
  type: "canvas",
  src: "",
  mode: "void",
  caption: "FIG 01 · ZERO AUTOPILOT",
  alt: "ZeroCommit gravitational black-hole visual"
};

class ThesisScreen extends HTMLElement {
  connectedCallback() {
    const mediaType = this.getAttribute("media-type") || DEFAULT_MEDIA.type;
    const mediaSrc = this.getAttribute("media-src") || DEFAULT_MEDIA.src;
    const mediaMode = this.getAttribute("media-mode") || DEFAULT_MEDIA.mode;
    const mediaCaption = this.getAttribute("media-caption") || DEFAULT_MEDIA.caption;
    const mediaAlt = this.getAttribute("media-alt") || DEFAULT_MEDIA.alt;

    const srcAttr = mediaSrc ? ` src="${mediaSrc}"` : "";

    this.innerHTML = `
      <link rel="stylesheet" href="./components/thesis-screen/thesis-screen.css">
      <section class="thesis-screen" aria-labelledby="thesis-heading">
        <div class="thesis-screen__copy">
          <span class="thesis-screen__eyebrow">01 / THE SHIFT</span>
          <h2 class="thesis-screen__title" id="thesis-heading">
            Bring any AI.<br>Ship in browser.
          </h2>
          <p class="thesis-screen__lead">
            No Git installs. No runaway agents. Paste code, review, push.
          </p>
          <div class="thesis-screen__models">
            ChatGPT · Claude · Gemini · DeepSeek · Qwen · GLM
          </div>
        </div>
        <div class="thesis-screen__visual">
          <artifact-bay
            type="${mediaType}"${srcAttr}
            mode="${mediaMode}"
            surface="dark"
            caption="${mediaCaption}"
            alt="${mediaAlt}">
          </artifact-bay>
        </div>
      </section>
    `;
  }
}

customElements.define("thesis-screen", ThesisScreen);
