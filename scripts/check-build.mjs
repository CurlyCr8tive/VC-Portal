import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

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

console.log(
  `Build check passed: ${checkedFiles.length} JavaScript files parsed, ${htmlFiles.length} HTML files checked, and both API packages are installed.`
);
