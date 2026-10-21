import { icon } from "./icons.js";
import { esc } from "./format.js";

const btn = (text, action, cls = "secondary", attrs = "") =>
  `<button type="button" class="button ${cls}" data-action="${action}" ${attrs}>${text}</button>`;

const link = (text, route, cls = "secondary") =>
  `<a class="button ${cls}" href="#${route}">${text}</a>`;

const pill = (text, tone = "neutral") =>
  `<span class="pill ${tone}">${esc(text)}</span>`;

const field = (label, name, value = "", attrs = "") =>
  `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${attrs}></label>`;

const notice = (text, type = "info") =>
  `<div class="notice ${type}">${icon("info", 18)}<span>${text}</span></div>`;

const avatar = (r, large = false) =>
  `<span class="resident-avatar${large ? " large" : ""}" data-tone="${esc(r.id)}">${esc(r.initial || r.name?.slice(0, 1) || "동")}</span>`;

const empty = (title, body, action = "") =>
  `<div class="empty-state">${icon("leaf", 34)}<h2>${title}</h2><p>${body}</p>${action}</div>`;

function heading(title, description = "", action = "") {
  return /* HTML */ `<header class="page-heading">
    <div>
      <p class="eyebrow">GRACE TOGETHER</p>
      <h1>${title}</h1>
      ${description ? `<p class="muted">${description}</p>` : ""}
    </div>
    ${action}
  </header>`;
}

export { btn, link, pill, field, notice, avatar, empty, heading };
