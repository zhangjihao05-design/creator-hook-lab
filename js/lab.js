// Hook Lab: page state and operations.
// The page's buttons and the agents (through site-actions.js) call the same methods on
// App.page, so both follow one set of rules. Operations refuse bad input by returning
// {ok: false, reason, field} and change nothing.

export const LANGUAGES = ["English", "Simplified Chinese"];
export const PLATFORMS = ["YouTube", "X", "Both"];
export const STYLES = ["Question", "Bold claim", "Story", "Number", "Contrast", "Myth-bust", "Mistake", "Challenge"];
export const TITLE_LIMIT = 100;

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

/** Count length the way X does (CJK counts 2), which is what a creator runs into first. */
export function xLength(text) {
  let weight = 0;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    const light = (code <= 0x10ff) || (code >= 0x2000 && code <= 0x200d)
      || (code >= 0x2010 && code <= 0x201f) || (code >= 0x2032 && code <= 0x2037);
    weight += light ? 1 : 2;
  }
  return weight;
}

const score = (v) => Number.isInteger(v) && v >= 1 && v <= 10;

/** The lab: settings, a set of hooks with styles and scores, and title ideas. */
export class Lab {
  constructor(renderer = null) {
    this.renderer = renderer;
    this.version = 0;
    this.settings = {topic: "", audience: "", platform: "Both", language: "English"};
    this.hooks = [];
    this.titles = [];
    this.winner = null; // index into hooks
    this.verdict = "";
  }

  changed(panel) {
    this.version += 1;
    if (this.renderer) this.renderer(panel, this);
  }

  getState() {
    return JSON.parse(JSON.stringify({
      version: this.version,
      settings: this.settings,
      limits: {languages: LANGUAGES, platforms: PLATFORMS, styles: STYLES, hooks: "4 to 8", titles: "2 to 6", titleMaxCharacters: TITLE_LIMIT, xPostWeightLimit: 280},
      hooks: this.hooks.map((h, i) => ({number: i + 1, ...h})),
      titles: this.titles,
      winner: this.winner === null ? null : this.winner + 1,
      verdict: this.verdict,
      links: {
        creatorAgentStudio: "https://creator-agent-studio.pages.dev/",
      },
    }));
  }

  setSettings(input) {
    const next = {...this.settings, ...input};
    next.topic = clean(next.topic, 300);
    next.audience = clean(next.audience, 200);
    if (!next.topic) return {ok: false, reason: "Enter a topic first.", field: "topic"};
    if (!PLATFORMS.includes(next.platform)) return {ok: false, reason: `Platform must be one of: ${PLATFORMS.join(", ")}.`, field: "platform"};
    if (!LANGUAGES.includes(next.language)) return {ok: false, reason: `Language must be one of: ${LANGUAGES.join(", ")}.`, field: "language"};
    const topicChanged = next.topic !== this.settings.topic;
    this.settings = next;
    if (topicChanged) {
      this.hooks = []; this.titles = []; this.winner = null; this.verdict = "";
      this.changed("hooks");
    }
    this.changed("settings");
    return {ok: true, version: this.version, settings: this.settings, clearedOldHooks: topicChanged};
  }

  /** Writer: save hooks (no scores yet) and title ideas. Replaces earlier hooks. */
  saveHooks({hooks, titles}) {
    if (!this.settings.topic) return {ok: false, reason: "Set a topic first.", field: "topic"};
    const list = (hooks || []).map((h) => ({text: clean(h.text, 400), style: clean(h.style, 40)}));
    if (list.length < 4 || list.length > 8) return {ok: false, reason: "Write 4 to 8 hooks.", field: "hooks"};
    const bad = list.findIndex((h) => !h.text || !STYLES.includes(h.style));
    if (bad >= 0) return {ok: false, reason: `Hook ${bad + 1} needs text and a style from: ${STYLES.join(", ")}.`, field: "hooks"};
    if (new Set(list.map((h) => h.style)).size < 3) return {ok: false, reason: "Use at least 3 different styles, so the hooks really differ.", field: "hooks"};
    const tooLong = list.map((h, i) => [i + 1, xLength(h.text)]).filter(([, w]) => w > 280);
    if (tooLong.length) return {ok: false, reason: `Hooks must fit one X post (280 weighted characters, CJK counts 2). Too long: ${tooLong.map(([n, w]) => `hook ${n} weighs ${w}`).join("; ")}.`, field: "hooks"};
    const t = (titles || []).map((x) => clean(x, 200)).filter(Boolean);
    if (t.length < 2 || t.length > 6) return {ok: false, reason: "Give 2 to 6 title ideas.", field: "titles"};
    const longT = t.findIndex((x) => x.length > TITLE_LIMIT);
    if (longT >= 0) return {ok: false, reason: `Title ${longT + 1} is over ${TITLE_LIMIT} characters, YouTube's limit.`, field: "titles"};
    this.hooks = list.map((h) => ({...h, weight: xLength(h.text), scores: null, total: null, note: ""}));
    this.titles = t;
    this.winner = null;
    this.verdict = "";
    this.changed("hooks");
    return {ok: true, version: this.version, hooks: this.hooks.length, titles: this.titles.length};
  }

  /** Critic: score every saved hook 1-10 on curiosity, clarity and promise, and pick one. */
  saveScores({scores, winner, verdict}) {
    if (!this.hooks.length) return {ok: false, reason: "There are no hooks to score yet.", field: "scores"};
    const list = scores || [];
    if (list.length !== this.hooks.length) return {ok: false, reason: `Score all ${this.hooks.length} hooks, one entry each, in order.`, field: "scores"};
    const bad = list.findIndex((s) => !score(s.curiosity) || !score(s.clarity) || !score(s.promise));
    if (bad >= 0) return {ok: false, reason: `Hook ${bad + 1}: curiosity, clarity and promise must each be a whole number from 1 to 10.`, field: "scores"};
    if (!Number.isInteger(winner) || winner < 1 || winner > this.hooks.length) return {ok: false, reason: `Winner must be a hook number from 1 to ${this.hooks.length}.`, field: "winner"};
    this.hooks = this.hooks.map((h, i) => {
      const s = list[i];
      return {...h, scores: {curiosity: s.curiosity, clarity: s.clarity, promise: s.promise}, total: s.curiosity + s.clarity + s.promise, note: clean(s.note, 200)};
    });
    this.winner = winner - 1;
    this.verdict = clean(verdict, 400);
    this.changed("hooks");
    return {ok: true, version: this.version, winner, winnerText: this.hooks[this.winner].text};
  }

  clear() {
    this.hooks = []; this.titles = []; this.winner = null; this.verdict = "";
    this.changed("hooks");
    return {ok: true, version: this.version};
  }

  toMarkdown() {
    const out = [`# Hooks: ${this.settings.topic || "untitled"}`, ""];
    this.hooks.forEach((h, i) => out.push(`${i + 1}. ${i === this.winner ? "**[winner]** " : ""}${h.text} _(${h.style}${h.total ? `, ${h.total}/30` : ""})_`));
    if (this.verdict) out.push("", this.verdict);
    if (this.titles.length) out.push("", "## Titles", ...this.titles.map((t) => `- ${t}`));
    return out.join("\n");
  }
}

/** Holds the one page object the page, site.js and site-actions.js share. */
export class App {
  static page = new Lab();
}
