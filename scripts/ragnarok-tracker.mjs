const NS = "berserkr-rpg";
const SETTING = "ragnarokTracker";
const LEGACY_FLAG = "ragnarokTracker";
const GODS = ["Odin", "Loki", "Thor", "Tyr", "Vidar", "Freyja", "Frigg", "Surtr", "Nidhogg", "Fenrir", "Heimdall", "Jörmungandr", "Hel"];
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
let tracker;
let calendar;

const freshState = () => ({
  schema: 2, progress: 0, steps: [], phase: "campaign", side: null,
  fallenGods: [], outcomes: [], notes: [], history: [], battle: { odin: 0, loki: 0 }
});

function normalizeState(raw) {
  const base = freshState();
  if (!raw || typeof raw !== "object") return base;
  const state = { ...base, ...raw };
  state.progress = Math.max(0, Math.min(30, Number(state.progress) || 0));
  state.steps = Array.isArray(state.steps) ? state.steps.slice(0, 30) : Array.from({ length: state.progress }, (_, i) => ({ side: i < 15 ? "odin" : "loki", label: "Avanço anterior" }));
  state.progress = state.steps.length || state.progress;
  state.fallenGods = Array.isArray(state.fallenGods) ? state.fallenGods.filter(g => GODS.includes(g)) : [];
  state.outcomes = Array.isArray(state.outcomes) ? state.outcomes.slice(-20) : [];
  state.notes = Array.isArray(state.notes) ? state.notes.slice(-30) : [];
  state.history = Array.isArray(state.history) ? state.history.slice(-40) : [];
  state.battle = { odin: 0, loki: 0, ...(state.battle || {}) };
  state.battle.odin = Math.max(0, Math.min(15, Number(state.battle.odin) || 0));
  state.battle.loki = Math.max(0, Math.min(15, Number(state.battle.loki) || 0));
  state.phase = state.progress >= 30 ? "battle" : "campaign";
  return state;
}

function snapshot(state) {
  const copy = foundry.utils.deepClone(state);
  copy.history = [];
  return copy;
}

async function readState() {
  const saved = game.settings.get(NS, SETTING);
  if (saved) return normalizeState(saved);
  const legacy = game.user.getFlag(NS, LEGACY_FLAG);
  return normalizeState(legacy);
}

async function writeState(state) {
  await game.settings.set(NS, SETTING, normalizeState(state));
}

export class RagnarokTracker extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "berserkr-ragnarok-tracker",
    classes: ["berserkr-ragnarok"],
    window: { title: "Ragnarök · Mestre", resizable: true },
    position: { width: 900, height: 820 },
    actions: {
      odin: this.prototype.advanceOdin,
      loki: this.prototype.advanceLoki,
      undo: this.prototype.undo,
      toggleGod: this.prototype.toggleGod,
      addOutcome: this.prototype.addOutcome,
      addNote: this.prototype.addNote,
      battleOdinUp: this.prototype.battleOdinUp,
      battleOdinDown: this.prototype.battleOdinDown,
      battleLokiUp: this.prototype.battleLokiUp,
      battleLokiDown: this.prototype.battleLokiDown
    }
  };

  static PARTS = { main: { template: "systems/berserkr-rpg/templates/ragnarok-tracker.hbs" } };

  async _prepareContext() {
    const state = await readState();
    const segments = Array.from({ length: 30 }, (_, i) => ({
      number: i + 1,
      className: i < state.progress ? `filled ${state.steps[i]?.side || "odin"}` : "",
      title: i < 15 ? `Passo ${i + 1} · rumo ao clímax` : `Passo ${i + 1} · retorno ao centro`
    }));
    const circles = (side, value) => Array.from({ length: 15 }, (_, i) => ({
      number: i + 1,
      className: i < value ? `filled ${side}` : ""
    }));
    return {
      ...state,
      segments,
      odinCircle: circles("odin", state.battle.odin),
      lokiCircle: circles("loki", state.battle.loki),
      gods: GODS.map(name => ({ name, fallen: state.fallenGods.includes(name) })),
      recentOutcomes: [...state.outcomes].reverse(),
      recentNotes: [...state.notes].reverse(),
      recentHistory: [...state.history].reverse(),
      phaseLabel: state.phase === "battle" ? "Batalha final" : "Presságios e escolhas",
      lastSideLabel: state.side === "odin" ? "Odin" : state.side === "loki" ? "Loki" : "Ainda não definido",
      isFinalBattle: state.phase === "battle",
      canUndo: state.history.length > 0,
      canOdinReduce: state.battle.odin > 0,
      canLokiReduce: state.battle.loki > 0
    };
  }

  async _change(mutator, label) {
    if (!game.user.isGM || this.busy) return;
    this.busy = true;
    try {
      const state = await readState();
      state.history.push({ label, before: snapshot(state), at: Date.now() });
      state.history = state.history.slice(-40);
      mutator(state);
      state.progress = Math.max(0, Math.min(30, state.steps.length));
      state.phase = state.progress >= 30 ? "battle" : "campaign";
      await writeState(state);
      await this.render({ force: true });
      renderPublicTracker(state);
    } finally { this.busy = false; }
  }

  async advanceOdin() { await this._change(s => { if (s.steps.length < 30) s.steps.push({ side: "odin", label: "Odin" }); s.side = "odin"; }, "Odin moveu o destino +1"); }
  async advanceLoki() { await this._change(s => { if (s.steps.length < 30) s.steps.push({ side: "loki", label: "Loki" }); s.side = "loki"; }, "Loki moveu o destino +1"); }

  async undo() {
    if (!game.user.isGM || this.busy) return;
    this.busy = true;
    try {
      const state = await readState();
      const previous = state.history.pop();
      if (!previous?.before) return;
      const restored = normalizeState(previous.before);
      restored.history = state.history;
      await writeState(restored);
      await this.render({ force: true });
      renderPublicTracker(restored);
    } finally { this.busy = false; }
  }

  async toggleGod(_event, target) {
    const name = target?.dataset?.god;
    if (!GODS.includes(name)) return;
    await this._change(s => { s.fallenGods = s.fallenGods.includes(name) ? s.fallenGods.filter(g => g !== name) : [...s.fallenGods, name]; }, `${name}: estado de queda alterado`);
  }

  async addOutcome() {
    const input = this.element?.querySelector("[data-outcome-input]");
    const value = input?.value?.trim();
    if (!value) return;
    await this._change(s => { s.outcomes.push({ text: value, at: Date.now() }); s.outcomes = s.outcomes.slice(-20); }, "Resultado de teste registrado");
    const field = this.element?.querySelector("[data-outcome-input]"); if (field) field.value = "";
  }

  async addNote() {
    const input = this.element?.querySelector("[data-note-input]");
    const value = input?.value?.trim();
    if (!value) return;
    await this._change(s => { s.notes.push({ text: value, at: Date.now() }); s.notes = s.notes.slice(-30); }, "Decisão ou nota registrada");
    const field = this.element?.querySelector("[data-note-input]"); if (field) field.value = "";
  }

  async _battle(side, delta) {
    await this._change(s => { s.battle[side] = Math.max(0, Math.min(15, s.battle[side] + delta)); }, `${side === "odin" ? "Odin" : "Loki"}: batalha final ${delta > 0 ? "+1" : "−1"}`);
  }
  async battleOdinUp() { await this._battle("odin", 1); }
  async battleOdinDown() { await this._battle("odin", -1); }
  async battleLokiUp() { await this._battle("loki", 1); }
  async battleLokiDown() { await this._battle("loki", -1); }
}

export async function openRagnarokTracker() {
  if (!game.user.isGM) return;
  tracker ??= new RagnarokTracker();
  await tracker.render({ force: true });
  tracker.bringToFront();
}

export async function toggleRagnarokTracker() {
  if (!game.user.isGM) return;
  tracker ??= new RagnarokTracker();
  if (tracker.rendered) await tracker.close();
  else await openRagnarokTracker();
}

function addDirectoryButton(app, html) {
  if (!game.user.isGM) return;
  const root = html?.querySelector ? html : html?.[0] ?? app?.element;
  if (!root?.querySelector || root.querySelector("[data-ragnarok-open]")) return;
  const button = document.createElement("button");
  button.dataset.ragnarokOpen = "";
  button.className = "berserkr-ragnarok-open";
  button.innerHTML = '<i class="fa-solid fa-yin-yang"></i> Abrir/fechar Ragnarök';
  button.title = "Alternar painel do Ragnarök (somente mestre)";
  button.addEventListener("click", toggleRagnarokTracker);
  const host = root.querySelector(".directory-header .header-actions")
    ?? root.querySelector(".directory-header")
    ?? root.querySelector(".header-actions")
    ?? root.querySelector(".window-content")
    ?? root;
  host.prepend(button);
}

export class RagnarokCalendar extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "berserkr-ragnarok-calendar", classes: ["berserkr-ragnarok"],
    window: { title: "Calendário do Ragnarök", resizable: true },
    position: { width: 660, height: 600 }
  };
  static PARTS = { main: { template: "systems/berserkr-rpg/templates/ragnarok-calendar.hbs" } };
  async _prepareContext() {
    const state = await readState();
    return {
      progress: state.progress,
      phaseLabel: state.phase === "battle" ? "Batalha final" : "Presságios e escolhas",
      battle: state.battle, fallenGods: state.fallenGods,
      days: Array.from({ length: 30 }, (_, i) => ({
        number: i + 1,
        className: i < state.progress ? `filled ${state.steps[i]?.side || "odin"}` : i === state.progress ? "current" : "",
        label: i < state.progress ? (state.steps[i]?.side === "loki" ? "Loki" : "Odin") : i === state.progress ? "Próximo marco" : "Por vir"
      }))
    };
  }
}

export async function toggleRagnarokCalendar() {
  calendar ??= new RagnarokCalendar();
  if (calendar.rendered) await calendar.close();
  else { await calendar.render({ force: true }); calendar.bringToFront(); }
}

function ensureLauncher() {
  let launcher = document.getElementById("berserkr-ragnarok-launcher");
  if (launcher) return;
  launcher = document.createElement("nav");
  launcher.id = "berserkr-ragnarok-launcher";
  launcher.setAttribute("aria-label", "Ragnarök");
  const button = (label, handler) => {
    const el = document.createElement("button");
    el.type = "button"; el.textContent = label;
    el.addEventListener("click", handler); launcher.append(el);
  };
  if (game.user.isGM) button("Abrir/fechar Ragnarök", toggleRagnarokTracker);
  button("Calendário do Ragnarök", toggleRagnarokCalendar);
  document.body.append(launcher);
}

function renderPublicTracker(state) {
  ensureLauncher();
  let el = document.getElementById("berserkr-ragnarok-public");
  if (!el) {
    el = document.createElement("div");
    el.id = "berserkr-ragnarok-public";
    el.setAttribute("aria-label", "Progresso do Ragnarök");
    document.body.append(el);
  }
  const data = normalizeState(state);
  const pips = Array.from({ length: 30 }, (_, i) => `<i class="${i < data.progress ? `filled ${data.steps[i]?.side || "odin"}` : ""}"></i>`).join("");
  el.innerHTML = `<strong>RAGNARÖK</strong><span>${data.progress}/30 · ${data.phase === "battle" ? "Batalha final" : "Presságios"}</span><div class="rk-public-track">${pips}</div>`;
  el.hidden = false;
}

function removePublicTracker() { document.getElementById("berserkr-ragnarok-public")?.remove(); }

export function registerRagnarokTracker() {
  game.settings.register(NS, SETTING, { name: "Estado do rastreador do Ragnarök", scope: "world", config: false, type: Object, default: null, onChange: state => { renderPublicTracker(state); if (calendar?.rendered) calendar.render({ force: true }); if (tracker?.rendered) tracker.render({ force: true }); } });
  Hooks.on("getSceneControlButtons", controls => {
    if (!game.user.isGM || !controls?.tokens?.tools) return;
    controls.tokens.tools.ragnarokTracker = {
      name: "ragnarokTracker",
      title: "Abrir/fechar Ragnarök",
      icon: "fa-solid fa-yin-yang",
      order: Object.keys(controls.tokens.tools).length,
      button: true,
      visible: true,
      onChange: () => toggleRagnarokTracker()
    };
  });
  Hooks.on("renderJournalDirectory", addDirectoryButton);
  Hooks.on("renderSidebarTab", (app, html) => { if (app.tabName === "journal") addDirectoryButton(app, html); });
  Hooks.on("canvasReady", async () => renderPublicTracker(await readState()));
  Hooks.on("canvasTearDown", removePublicTracker);
  Hooks.once("ready", async () => {
    game.berserkr = { ...(game.berserkr || {}), openRagnarokTracker, toggleRagnarokTracker, toggleRagnarokCalendar };
    if (game.user.isGM && !game.settings.get(NS, SETTING)) {
      const legacy = game.user.getFlag(NS, LEGACY_FLAG);
      if (legacy) await writeState(legacy);
    }
    ensureLauncher();
    renderPublicTracker(await readState());
  });
}
