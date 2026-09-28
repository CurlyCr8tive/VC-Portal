// Seeds Greyz Bistro's coaching program into Supabase for real client testing.
//
// This mirrors the existing owner demo seed, but writes to the live Supabase
// coaching tables so a real pr_client account can see the program through
// server/client-api.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GREYZ_COACHING_CLIENT,
  GREYZ_COACHING_OPPORTUNITIES,
  GREYZ_COACHING_PHASES,
  GREYZ_COACHING_RESOURCES,
} from "../src/owner/seedGreyzBistroCoachingData.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
    if (match && match[2].trim() && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function encodeFilterValue(value) {
  return encodeURIComponent(String(value).replaceAll("*", ""));
}

readEnvFile(path.join(root, "server/owner-api/.env"));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/owner-api/.env.");
  process.exit(1);
}

async function rest(pathSuffix, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathSuffix}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(prefer ? { prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${pathSuffix} failed (${res.status}): ${JSON.stringify(parsed).slice(0, 500)}`);
  }
  return parsed;
}

async function findClientByName(name) {
  const exact = await rest(`clients?name=eq.${encodeFilterValue(name)}&select=id,name`);
  return exact[0] || null;
}

async function getPhase(clientId, phaseNumber) {
  const rows = await rest(`coaching_phases?client_id=eq.${clientId}&phase_number=eq.${phaseNumber}&select=id`);
  return rows[0] || null;
}

async function upsertPhase(clientId, phase) {
  const existing = await getPhase(clientId, phase.phaseNumber);
  const row = {
    client_id: clientId,
    phase_number: phase.phaseNumber,
    name: phase.name,
    weeks: phase.weeks || null,
    vaam: phase.vaam,
    status: phase.status,
    goal: phase.goal || null,
    deliverables: phase.deliverables || [],
    notes: phase.notes || null,
  };
  if (!WRITE) return { id: existing?.id || "(created on --write)", existed: Boolean(existing) };
  if (existing) {
    const updated = await rest(`coaching_phases?id=eq.${existing.id}&select=id`, {
      method: "PATCH",
      body: row,
      prefer: "return=representation",
    });
    return { id: updated[0].id, existed: true };
  }
  const created = await rest("coaching_phases?select=id", {
    method: "POST",
    body: row,
    prefer: "return=representation",
  });
  return { id: created[0].id, existed: false };
}

async function getHomework(phaseId, text) {
  const rows = await rest(`coaching_homework?phase_id=eq.${phaseId}&text=eq.${encodeFilterValue(text)}&select=id`);
  return rows[0] || null;
}

async function upsertHomework(phaseId, item) {
  const existing = await getHomework(phaseId, item.text);
  const row = {
    phase_id: phaseId,
    type: item.type,
    text: item.text,
    due_date: item.type === "standing" ? null : item.dueDate || null,
    status: item.status,
    response: item.response || null,
  };
  if (!WRITE) return { existed: Boolean(existing) };
  if (existing) {
    await rest(`coaching_homework?id=eq.${existing.id}`, {
      method: "PATCH",
      body: row,
      prefer: "return=minimal",
    });
    return { existed: true };
  }
  await rest("coaching_homework", {
    method: "POST",
    body: row,
    prefer: "return=minimal",
  });
  return { existed: false };
}

async function getByTitle(table, clientId, title) {
  const rows = await rest(`${table}?client_id=eq.${clientId}&title=eq.${encodeFilterValue(title)}&select=id`);
  return rows[0] || null;
}

async function upsertOpportunity(clientId, opportunity) {
  const existing = await getByTitle("opportunities", clientId, opportunity.title);
  const row = {
    client_id: clientId,
    title: opportunity.title,
    description: opportunity.description || null,
    scores: opportunity.scores || {},
    decision_status: opportunity.decisionStatus,
    write_up: opportunity.writeUp || null,
  };
  if (!WRITE) return { existed: Boolean(existing) };
  if (existing) {
    await rest(`opportunities?id=eq.${existing.id}`, {
      method: "PATCH",
      body: row,
      prefer: "return=minimal",
    });
    return { existed: true };
  }
  await rest("opportunities", {
    method: "POST",
    body: row,
    prefer: "return=minimal",
  });
  return { existed: false };
}

async function upsertResource(clientId, resource) {
  const existing = await getByTitle("coaching_resources", clientId, resource.title);
  const row = {
    client_id: clientId,
    kind: resource.kind,
    title: resource.title,
    content: resource.content || null,
    priority: resource.priority || "medium",
    completed: resource.kind === "checklist" ? Boolean(resource.completed) : null,
  };
  if (!WRITE) return { existed: Boolean(existing) };
  if (existing) {
    await rest(`coaching_resources?id=eq.${existing.id}`, {
      method: "PATCH",
      body: row,
      prefer: "return=minimal",
    });
    return { existed: true };
  }
  await rest("coaching_resources", {
    method: "POST",
    body: row,
    prefer: "return=minimal",
  });
  return { existed: false };
}

const client = await findClientByName(GREYZ_COACHING_CLIENT);
if (!client) {
  console.error(`No Supabase client row found for ${GREYZ_COACHING_CLIENT}.`);
  process.exit(1);
}

const counts = {
  phasesCreated: 0,
  phasesUpdated: 0,
  homeworkCreated: 0,
  homeworkUpdated: 0,
  opportunitiesCreated: 0,
  opportunitiesUpdated: 0,
  resourcesCreated: 0,
  resourcesUpdated: 0,
};

for (const phase of GREYZ_COACHING_PHASES) {
  const phaseResult = await upsertPhase(client.id, phase);
  if (phaseResult.existed) counts.phasesUpdated += 1;
  else counts.phasesCreated += 1;
  if (!WRITE && !phaseResult.existed) {
    counts.homeworkCreated += (phase.homework || []).length;
    continue;
  }
  for (const homework of phase.homework || []) {
    const result = await upsertHomework(phaseResult.id, homework);
    if (result.existed) counts.homeworkUpdated += 1;
    else counts.homeworkCreated += 1;
  }
}

for (const opportunity of GREYZ_COACHING_OPPORTUNITIES) {
  const result = await upsertOpportunity(client.id, opportunity);
  if (result.existed) counts.opportunitiesUpdated += 1;
  else counts.opportunitiesCreated += 1;
}

for (const resource of GREYZ_COACHING_RESOURCES) {
  const result = await upsertResource(client.id, resource);
  if (result.existed) counts.resourcesUpdated += 1;
  else counts.resourcesCreated += 1;
}

console.log(`Supabase: ${new URL(SUPABASE_URL).host}`);
console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}`);
console.log(`Client: ${client.name} (${client.id})`);
console.log(JSON.stringify(counts, null, 2));
if (!WRITE) console.log("Dry run only. Re-run with --write to apply.");
