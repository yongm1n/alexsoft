import { $ } from "./format.js";
import { icon } from "./icons.js";
import { btn } from "./components.js";

let overlayReturn = null;
let confirmHandler = null;

function closeOverlay(restore = true) {
  const host = $("#overlay");
  if (!host.childElementCount) return;
  host.replaceChildren();
  document.body.classList.remove("overlay-open");
  $("#app").inert = false;
  $(".demo-banner").inert = false;
  if (restore && overlayReturn?.isConnected) overlayReturn.focus();
  confirmHandler = null;
}

function openModal(title, body, footer = "", wide = false) {
  if (!$("#overlay").childElementCount) overlayReturn = document.activeElement;
  $("#overlay").innerHTML = /* HTML */ `<div
    class="modal-backdrop"
    data-action="backdrop"
  >
    <section
      class="modal ${wide ? "wide" : ""}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <header class="modal-header">
        <h2 id="dialog-title">${title}</h2>
        ${btn(icon("close"), "close-modal", "icon-button", 'aria-label="닫기"')}
      </header>
      <div class="modal-body">${body}</div>
      ${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}
    </section>
  </div>`;
  document.body.classList.add("overlay-open");
  $("#app").inert = true;
  $(".demo-banner").inert = true;
  queueMicrotask(() => $("#overlay button, #overlay input")?.focus());
}

function confirm(title, body, actionLabel, callback, danger = false) {
  openModal(
    title,
    body,
    btn("취소", "close-modal") +
      btn(actionLabel, "confirm-run", danger ? "danger" : "primary"),
  );
  confirmHandler = callback;
}

function openDrawer(markup) {
  overlayReturn = document.activeElement;
  $("#overlay").innerHTML = markup;
  document.body.classList.add("overlay-open");
  $("#app").inert = true;
  $(".demo-banner").inert = true;
  queueMicrotask(() => $("#overlay button")?.focus());
}

function preserveReturnFocus(originalFocus) {
  const overlay = $("#overlay");
  if (
    overlay.childElementCount &&
    originalFocus?.isConnected &&
    !overlay.contains(originalFocus)
  ) {
    overlayReturn = originalFocus;
  }
}

async function runConfirmation() {
  const run = confirmHandler;
  if (run) await run();
}

function trapOverlayKeys(event) {
  if (!$("#overlay").childElementCount) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeOverlay();
    return;
  }
  if (event.key !== "Tab") return;
  const items = [
    ...$("#overlay").querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]',
    ),
  ].filter((element) => element.getClientRects().length);
  const first = items[0];
  const last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export {
  closeOverlay,
  openModal,
  confirm,
  openDrawer,
  preserveReturnFocus,
  runConfirmation,
  trapOverlayKeys,
};
