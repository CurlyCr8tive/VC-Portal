// src/owner/components/InfoPopover.js
//
// One reusable "what is this section for" popover, used across every
// admin page from here on. A metric card already had a plain title=
// hover tooltip (OwnerSidebar-adjacent code) — that's fine for a one-line
// note, but doesn't work on touch, can't hold more than a sentence, and
// disappears the instant the pointer moves. This is for the different,
// higher-level question a section needs answered once: not "what does
// this field mean" (Opportunity Evaluator's five criteria already have
// their own inline hints — see EVALUATION_CRITERIA_HELP), but "why does
// this section exist, what does it do, and why should I trust the
// number/answer it gives me."
//
// EVENT DELEGATION, not per-instance wiring: sectionInfoButton() returns
// a plain HTML snippet with the title/body baked into data attributes.
// It works the moment it's dropped into any innerHTML template, including
// ones that get replaced wholesale on every re-render (this app's normal
// pattern) — there's nothing to re-attach. installInfoPopoverDelegate()
// is called exactly once, at app startup.

let popoverEl = null;
function ensurePopoverEl() {
  if (popoverEl) return popoverEl;
  popoverEl = document.createElement("div");
  popoverEl.className = "info-popover";
  popoverEl.hidden = true;
  popoverEl.setAttribute("role", "dialog");
  document.body.appendChild(popoverEl);
  return popoverEl;
}

function escapePopoverText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function closePopover() {
  if (popoverEl) popoverEl.hidden = true;
}

function openPopoverFor(button) {
  const el = ensurePopoverEl();
  const title = button.dataset.infoTitle || "";
  const body = button.dataset.infoBody || "";
  el.innerHTML = `
    <div class="info-popover-inner">
      <div class="info-popover-head">
        <strong>${escapePopoverText(title)}</strong>
        <button type="button" class="info-popover-close" aria-label="Close">&times;</button>
      </div>
      <p>${escapePopoverText(body)}</p>
    </div>
  `;
  el.hidden = false;

  // Position below the trigger, flipped above if it would run off the
  // bottom of the viewport, clamped so it never runs off either side.
  const rect = button.getBoundingClientRect();
  const width = 300;
  const height = el.offsetHeight || 160;
  let left = rect.left;
  left = Math.max(12, Math.min(left, document.documentElement.clientWidth - width - 12));
  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow > height + 12 ? rect.bottom + 6 : Math.max(12, rect.top - height - 6);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.width = `${width}px`;
  el.dataset.openFor = button.dataset.infoTitle;

  el.querySelector(".info-popover-close").addEventListener("click", closePopover);
}

/**
 * Call exactly once, at app startup. Uses event delegation so it keeps
 * working through every future innerHTML re-render — no per-page wiring.
 */
export function installInfoPopoverDelegate() {
  // Capture phase matters because many new dashboard surfaces are themselves
  // clickable cards. Without catching this before those parent handlers, the
  // section info button can accidentally trigger navigation instead of
  // opening its explanation.
  document.addEventListener(
    "click",
    (e) => {
      const trigger = e.target.closest(".info-popover-trigger");
      if (!trigger) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const alreadyOpenForThis = popoverEl && !popoverEl.hidden && popoverEl.dataset.openFor === trigger.dataset.infoTitle;
      if (alreadyOpenForThis) {
        closePopover();
      } else {
        openPopoverFor(trigger);
      }
    },
    true
  );

  document.addEventListener("click", (e) => {
    if (e.target.closest(".info-popover-trigger")) return;
    if (popoverEl && !popoverEl.hidden && !popoverEl.contains(e.target)) closePopover();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopover();
  });
}

/**
 * Returns the HTML for a small (i) button that opens the popover. Drop it
 * next to any section heading: `<h2>Reports</h2> ${sectionInfoButton(...)}`.
 * title/body are plain text — escape happens here, callers never need to.
 */
export function sectionInfoButton({ title, body }) {
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  return `<button type="button" class="info-popover-trigger" aria-label="What is this?" data-info-title="${esc(title)}" data-info-body="${esc(body)}">i</button>`;
}
