// Small shared helpers for the client-portal components.

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function statusToClass(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

let uidCounter = 0;
export function nextId(prefix) {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}
