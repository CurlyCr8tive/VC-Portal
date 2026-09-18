import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { calculateCoachingProgress } from "../src/coachingProgress.js";
import { addHomeworkItem, respondToReflection, updateHomeworkStatus } from "../src/coachingPhaseSchema.js";
import { averageScore, createOpportunity } from "../src/opportunitySchema.js";
import { createPlacement, applyPlacementEdit } from "../src/schema.js";
import { summarizeFlaggedAVE, findDuplicateAVEAcrossClients } from "../src/aveDataQuality.js";
import { estimateAVE, AUDIENCE_METRICS } from "../src/aveEstimation.js";
import { OUTLET_TRAFFIC_REFERENCE } from "../src/outletTrafficReference.js";

const root = process.cwd();
const skippedDirs = new Set([".git", "node_modules"]);
const checkedFiles = [];
const htmlFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".js")) {
      checkedFiles.push(fullPath);
    }
    if (entry.isFile() && fullPath.endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }
}

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

walk(root);

for (const file of checkedFiles) {
  run(`Syntax check ${relative(root, file)}`, "node", ["--check", file]);
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const assetPattern = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(assetPattern)) {
    const assetPath = match[1].split(/[?#]/, 1)[0];
    if (/^(?:https?:)?\/\//.test(assetPath) || assetPath.startsWith("#")) continue;
    const resolvedAsset = join(root, assetPath);
    if (!existsSync(resolvedAsset)) {
      throw new Error(`${relative(root, file)} references missing asset: ${assetPath}`);
    }
  }
}

const apiPackages = ["server/owner-api", "server/client-api"];
for (const apiPath of apiPackages) {
  if (!existsSync(join(root, apiPath, "node_modules"))) {
    throw new Error(`${apiPath}/node_modules is missing. Run npm run install:apis first.`);
  }
  run(`npm package check ${apiPath}`, "npm", ["--prefix", apiPath, "pkg", "get", "name"]);
}

function runCoachingBehaviorChecks() {
  const basePhase = {
    id: "phase-1",
    client: "Greyz Bistro",
    phaseNumber: 1,
    name: "Research & Discovery",
    weeks: "1-2",
    vaam: "V",
    status: "in_progress",
    goal: "",
    deliverables: [],
    notes: "",
    homework: [],
  };
  const withAction = addHomeworkItem(basePhase, { type: "action", text: "Upload current media kit", dueDate: "2026-09-10" });
  const withStanding = addHomeworkItem(withAction, { type: "standing", text: "Bring every opportunity to Tenyse first" });
  const completedAction = updateHomeworkStatus(withStanding, withStanding.homework[0].id, "complete");
  const withReflection = addHomeworkItem(completedAction, { type: "reflection", text: "What proof point feels strongest?" });
  const completedReflection = respondToReflection(withReflection, withReflection.homework[2].id, "Chef-led hospitality experience.");
  const completePhase = { ...completedReflection, status: "complete" };
  const pendingPhase = { ...basePhase, id: "phase-2", phaseNumber: 2, status: "not_started" };
  const resources = [
    { id: "resource-1", kind: "resource", completed: null },
    { id: "checklist-1", kind: "checklist", completed: true },
    { id: "checklist-2", kind: "checklist", completed: false },
  ];
  const opportunities = [
    createOpportunity({ client: "Greyz Bistro", title: "Sponsor dinner", decisionStatus: "pursuing" }),
    createOpportunity({ client: "Greyz Bistro", title: "Gifted product promo" }),
  ];
  const progress = calculateCoachingProgress({ phases: [completePhase, pendingPhase], resources, opportunities });

  assert.deepEqual(progress.phases, { complete: 1, total: 2, percent: 50 });
  assert.deepEqual(progress.homework, { complete: 2, total: 2, percent: 100 });
  assert.deepEqual(progress.checklist, { complete: 1, total: 2, percent: 50 });
  assert.equal(progress.opportunities.total, 2);
  assert.equal(progress.opportunities.pipeline.pursuing, 1);
  assert.equal(progress.opportunities.pipeline.pressure_testing, 1);
  assert.equal(progress.opportunities.pipeline.declined, 0);
  assert.equal(averageScore(createOpportunity({ client: "Greyz Bistro", title: "Paid speaking", audienceFit: 5, credibility: 4 })), 4.5);
}

runCoachingBehaviorChecks();

/**
 * AVE data-quality guardrails. These protect a property that's easy to
 * break silently: a figure known to be unreliable must keep saying so.
 * The regression they guard against already happened once — the duplicate
 * $492,198 figure was displayed as ordinary real data because the caveat
 * lived only in source comments.
 */
function runAveDataQualityChecks() {
  const flagText = "duplicate of Candlelit Care";
  const flagged = createPlacement({
    publication: "8 outlets",
    headline: "CPG bundled campaign total",
    client: "VeganHood",
    aveValue: "492198",
    aveDataQuality: flagText,
  });
  const unflagged = createPlacement({ publication: "Essence", headline: "Feature", client: "Candlelit Care", aveValue: "1000" });

  assert.equal(flagged.aveDataQuality, flagText, "aveDataQuality must survive createPlacement");
  // null, never false — the app has no verification step, so the absence of
  // a flag means "no known problem," not "confirmed correct."
  assert.equal(unflagged.aveDataQuality, null, "a placement with no known problem must normalize to null");

  // The placement form renders no input for aveDataQuality, so raw never
  // carries it — an ordinary edit must not silently drop the warning.
  const { aveDataQuality: _omitted, ...formRaw } = flagged;
  const untouchedAve = applyPlacementEdit(flagged, { ...formRaw, headline: "CPG bundled campaign total (edited)" });
  assert.equal(untouchedAve.aveDataQuality, flagText, "editing an unrelated field must not clear the flag");

  // Correcting the figure itself does resolve it — a warning attached to a
  // number the owner just replaced would be worse than no warning.
  const correctedAve = applyPlacementEdit(flagged, { ...formRaw, aveValue: "250000" });
  assert.equal(correctedAve.aveDataQuality, null, "correcting the AVE figure must clear the flag");

  const summary = summarizeFlaggedAVE([flagged, unflagged]);
  assert.equal(summary.flaggedCount, 1);
  assert.equal(summary.flaggedTotal, 492198, "only flagged rows count toward the unconfirmed total");

  const duplicates = findDuplicateAVEAcrossClients([
    { client: "VeganHood", aveValue: 492198 },
    { client: "Candlelit Care", aveValue: 492198 },
    { client: "VeganHood", aveValue: 100000 },
    { client: "SNAP Co.", aveValue: null },
  ]);
  assert.equal(duplicates.length, 1, "the cross-client duplicate must be detected");
  assert.equal(duplicates[0].aveValue, 492198);

  // One client legitimately reporting the same figure on two placements is
  // not the template-reuse bug — flagging it would train the owner to
  // ignore the warning.
  const sameClient = findDuplicateAVEAcrossClients([
    { client: "VeganHood", aveValue: 5000 },
    { client: "VeganHood", aveValue: 5000 },
  ]);
  assert.equal(sameClient.length, 0, "two identical figures for one client must not be flagged");
}

runAveDataQualityChecks();

/**
 * Pins the two published AVE formulas to known-good outputs. These
 * constants come from Muck Rack's and Agility PR's own documentation
 * (cited in aveEstimation.js) — if someone "tidies" one, these fail
 * loudly rather than quietly changing figures Tenyse shows clients.
 */
function runAveEstimationChecks() {
  // Blavity News, 4,098,693 monthly uniques (SNAP Co. deck).
  const blavity = estimateAVE(4098693, "monthly_unique_visitors");
  assert.equal(Math.round(blavity.muckRack), 37913, "Muck Rack formula drifted");
  assert.equal(Math.round(blavity.agility), 3416, "Agility PR formula drifted");
  assert.equal(Math.round(blavity.low), 3416);
  assert.equal(Math.round(blavity.high), 37913);
  assert.equal(blavity.overstated, false, "a uniques-based estimate must not be marked overstated");

  // The ~1% agreement between the Muck Rack figure and Tenyse's own
  // reported $37,500-per-clip is the whole reason this method was chosen.
  // If that stops holding, the choice needs revisiting.
  const perClipFromHerDeck = (400000 - 100000) / 8;
  const gap = Math.abs(blavity.muckRack - perClipFromHerDeck) / perClipFromHerDeck;
  assert.ok(gap < 0.05, `Muck Rack estimate no longer matches Tenyse's own per-clip figure (gap ${(gap * 100).toFixed(1)}%)`);

  // A visits-based figure must carry the overstatement flag.
  assert.equal(estimateAVE(71970000, "monthly_visits").overstated, true);

  // No usable audience produces no answer — never a zero, never a guess.
  assert.equal(estimateAVE(0), null);
  assert.equal(estimateAVE(null), null);
  assert.equal(estimateAVE("not a number"), null);

  // Every reference figure must declare what it measures and where it
  // came from — the provenance rule this file's whole point rests on.
  for (const entry of OUTLET_TRAFFIC_REFERENCE) {
    assert.ok(AUDIENCE_METRICS.includes(entry.metric), `${entry.outlet}: unknown metric ${entry.metric}`);
    assert.ok(entry.source && entry.source.length > 5, `${entry.outlet}: missing a source`);
    assert.ok(["owner_source", "third_party", "self_reported", "estimated"].includes(entry.confidence), `${entry.outlet}: bad confidence`);
    assert.ok(Number.isFinite(entry.value) && entry.value > 0, `${entry.outlet}: bad audience value`);
  }
}

runAveEstimationChecks();

console.log(
  `Build check passed: ${checkedFiles.length} JavaScript files parsed, ${htmlFiles.length} HTML files checked, both API packages are installed, and coaching, AVE data-quality, and AVE estimation checks passed.`
);
