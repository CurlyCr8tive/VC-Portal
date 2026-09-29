import { spawn } from "node:child_process";

const commands = [
  { name: "owner-api", cmd: "npm", args: ["run", "start:owner-api"] },
  { name: "client-api", cmd: "npm", args: ["run", "start:client-api"] },
  { name: "static", cmd: "npm", args: ["run", "serve:static"] },
];

const children = [];
let shuttingDown = false;

function colorFor(index) {
  const colors = [36, 35, 33];
  return `\x1b[${colors[index % colors.length]}m`;
}

function log(prefix, index, data) {
  const color = colorFor(index);
  const reset = "\x1b[0m";
  String(data)
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => console.log(`${color}[${prefix}]${reset} ${line}`));
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGINT");
  }
  setTimeout(() => process.exit(code), 250);
}

console.log("Starting local PR platform stack...");
console.log("- Frontend: http://localhost:8420/login.html");
console.log("- Owner API: http://localhost:4001/health");
console.log("- Client API: http://localhost:4002/health");
console.log("\nLeave this terminal open. Run checks in another terminal:");
console.log("  npm run handoff:check-real");
console.log("  npm run test:local-user-flow\n");

commands.forEach((entry, index) => {
  const child = spawn(entry.cmd, entry.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  child.stdout.on("data", (data) => log(entry.name, index, data));
  child.stderr.on("data", (data) => log(entry.name, index, data));
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[${entry.name}] exited early (${reason}). Stopping the local stack.`);
    shutdown(code || 1);
  });
});

process.on("SIGINT", () => {
  console.log("\nStopping local PR platform stack...");
  shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));
