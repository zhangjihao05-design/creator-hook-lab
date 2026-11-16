// Renders Hook Lab and wires the page's own buttons to App.page.
import { App, LANGUAGES, PLATFORMS } from "./lab.js";

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

function fillSelect(sel, values) {
  $(sel).replaceChildren(...values.map((v) => el("option", {value: v}, v)));
}

function render(panel, lab) {
  if (panel === "settings") {
    const s = lab.settings;
    $("#topic").value = s.topic; $("#audience").value = s.audience;
    $("#platform").value = s.platform; $("#language").value = s.language;
    return;
  }
  const box = $("#hooks-body");
  if (!lab.hooks.length) {
    box.replaceChildren(el("p", {class: "empty"}, "The Hook Writer drafts 4 to 8 openings in different styles here; the Hook Critic scores them and picks a winner."));
    $("#titles-body").replaceChildren(el("p", {class: "empty"}, "Title ideas appear here."));
    return;
  }
  const ol = el("ol", {class: "hooks"});
  lab.hooks.forEach((h, i) => {
    const li = el("li", {class: i === lab.winner ? "winner" : ""});
    const head = el("div", {class: "hook-meta"});
    head.append(el("span", {class: "style"}, h.style));
    if (i === lab.winner) head.append(el("span", {class: "badge"}, "Winner"));
    if (h.total !== null) head.append(el("span", {class: "total"}, `${h.total}/30`));
    li.append(head, el("p", {class: "hook-text"}, h.text));
    if (h.scores) {
      const bars = el("div", {class: "bars"});
      for (const k of ["curiosity", "clarity", "promise"]) {
        const row = el("div", {class: "bar"});
        const fill = el("span"); fill.style.width = `${h.scores[k] * 10}%`;
        const track = el("div", {class: "track"}); track.append(fill);
        row.append(el("label", {}, k), track, el("b", {}, String(h.scores[k])));
        bars.append(row);
      }
      li.append(bars);
      if (h.note) li.append(el("p", {class: "note"}, h.note));
    } else {
      li.append(el("p", {class: "note"}, "Waiting for the Hook Critic…"));
    }
    ol.append(li);
  });
  box.replaceChildren(ol);
  if (lab.verdict) box.append(el("p", {class: "verdict"}, lab.verdict));
  const ul = el("ul");
  lab.titles.forEach((t) => ul.append(el("li", {}, `${t} (${t.length})`)));
  $("#titles-body").replaceChildren(ul);
  const card = $("#hooks-card"); card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
}

function askAgents(text) {
  const input = document.querySelector("#ns-input");
  const send = document.querySelector("#ns-send");
  if (!input || !send) {
    $("#form-status").textContent = "The agents are not loaded yet. Add your AI key in AI model settings below.";
    return;
  }
  input.value = text;
  input.dispatchEvent(new Event("input", {bubbles: true}));
  send.click();
  document.querySelector("#assistant").scrollIntoView({behavior: "smooth", block: "start"});
}

function init() {
  fillSelect("#platform", PLATFORMS);
  fillSelect("#language", LANGUAGES);
  const lab = App.page;
  lab.renderer = render;
  render("settings", lab); render("hooks", lab);
  $("#lab-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const r = lab.setSettings({topic: $("#topic").value, audience: $("#audience").value, platform: $("#platform").value, language: $("#language").value});
    if (!r.ok) { $("#form-status").textContent = r.reason; $(`#${r.field}`)?.focus(); return; }
    $("#form-status").textContent = "Sent to the Hook Editor. Watch the agents in the chat.";
    askAgents("Write and score hooks and titles for the topic in the lab settings.");
  });
  $("#copy-md").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lab.toMarkdown()); $("#export-status").textContent = "Copied."; }
    catch { $("#export-status").textContent = "Copy failed."; }
  });
  $("#clear").addEventListener("click", () => lab.clear());
  document.querySelectorAll("[data-example]").forEach((b) => b.addEventListener("click", () => { $("#topic").value = b.dataset.example; $("#topic").focus(); }));
}

if (typeof document !== "undefined") init();
