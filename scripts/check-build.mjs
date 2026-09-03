import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { calculateCoachingProgress } from "../src/coachingProgress.js";
import { addHomeworkItem, respondToReflection, updateHomeworkStatus } from "../src/coachingPhaseSchema.js";
import { averageScore, createOpportunity } from "../src/opportunitySchema.js";

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
    const assetPath = match[1];
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

console.log(
  `Build check passed: ${checkedFiles.length} JavaScript files parsed, ${htmlFiles.length} HTML files checked, both API packages are installed, and coaching behavior checks passed.`
);
