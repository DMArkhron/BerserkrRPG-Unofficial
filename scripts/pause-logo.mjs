const LOGO = "systems/berserkr-rpg/assets/ui/berserkr-pause.png";

export function applyBerserkrPause(app, html) {
  const root = html?.querySelector ? html : html?.[0] ?? app?.element;
  if (!root?.querySelector) return;
  root.classList.add("berserkr-pause");
  let image = root.querySelector("img");
  if (!image) {
    image = document.createElement("img");
    root.prepend(image);
  }
  image.src = LOGO;
  image.alt = "Berserkr — jogo pausado";
  image.classList.add("berserkr-pause-logo");
  image.removeAttribute("width");
  image.removeAttribute("height");
}

// V13 GamePause; legacy hook retained for applications using the former name.
Hooks.on("renderGamePause", applyBerserkrPause);
Hooks.on("renderPause", applyBerserkrPause);
Hooks.once("ready", () => {
  if (ui.pause?.element) applyBerserkrPause(ui.pause, ui.pause.element);
});
