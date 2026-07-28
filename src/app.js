import { createPlacement } from "./schema.js";
import { loadPlacements, addPlacement, deletePlacement } from "./storage.js";
import { renderTable } from "./table.js";

const form = document.getElementById("placement-form");
const tbody = document.getElementById("placement-table-body");
const emptyState = document.getElementById("empty-state");
const countEl = document.getElementById("placement-count");

function refresh() {
  renderTable(loadPlacements(), tbody, emptyState, countEl, handleDelete);
}

function handleDelete(id) {
  deletePlacement(id);
  refresh();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const placement = createPlacement(data);
    addPlacement(placement);
    form.reset();
    refresh();
  } catch (err) {
    alert(err.message);
  }
});

refresh();
