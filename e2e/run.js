const { spawn } = require("child_process");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const SUITES = [
  "flow.js",
  "categories.js",
  "budgets.js",
  "dashboard.js",
  "recurring.js",
  "salary.js",
];
const ROOT = path.resolve(__dirname, "..");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isUp() {
  try {
    const response = await fetch(BASE);
    return response.ok;
  } catch {
    return false;
  }
}

function runSuite(suite) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, suite)], {
      cwd: __dirname,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  let server = null;

  if (!(await isUp())) {
    console.log(`Starting dev server for ${BASE} ...`);
    server = spawn("npm", ["run", "dev"], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true,
    });

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await sleep(1000);
      if (await isUp()) break;
      if (server.exitCode !== null) break;
    }

    if (!(await isUp())) {
      console.error("Dev server failed to start.");
      process.exit(1);
    }
  }

  const failures = [];
  for (const suite of SUITES) {
    console.log(`\n=== ${suite} ===`);
    const code = await runSuite(suite);
    if (code !== 0) failures.push(suite);
  }

  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      try {
        process.kill(server.pid, "SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }

  console.log(
    failures.length
      ? `\nFAILED suites: ${failures.join(", ")}`
      : `\nAll ${SUITES.length} suites passed.`,
  );
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
