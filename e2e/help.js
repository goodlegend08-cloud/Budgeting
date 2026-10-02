const { chromium } = require("playwright");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const SECTIONS = [
  "getting-started",
  "dashboard",
  "transactions",
  "budgets",
  "salary",
  "recurring",
  "categories",
  "import",
  "export",
  "data",
  "faq",
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(`${BASE}/help`);
  await page.getByRole("heading", { name: "Help & Tutorial" }).waitFor();
  check("help page opens", true);

  const missing = [];
  for (const id of SECTIONS) {
    if ((await page.locator(`#${id}`).count()) !== 1) missing.push(id);
  }
  check("every section is present", missing.length === 0, missing.join(","));

  const jumps = await page.locator('a[href^="#"]').count();
  check("jump links listed", jumps >= SECTIONS.length, `links=${jumps}`);

  const text = await page.locator("main").textContent();
  check(
    "covers split paydays and export",
    text.includes("Split into 2 paydays") &&
      text.includes("Download .xlsx") &&
      text.includes("8th & 23rd"),
  );
  check("warns about browser-only storage", text.includes("this browser only"));

  const sampleLink = await page.locator('a[href$="budget-import-2026.json"]').count();
  check("sample import file linked", sampleLink === 1, `links=${sampleLink}`);

  // --- reachable from the nav on every page ---
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  const navHelp = page.getByRole("link", { name: "Help" });
  check("help link in nav", (await navHelp.count()) === 1);
  await navHelp.click();
  await page
    .getByRole("heading", { name: "Help & Tutorial" })
    .waitFor({ timeout: 10000 });
  check("nav link opens the tutorial", page.url().includes("/help"), page.url());

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})().catch((error) => {
  console.log(results.join("\n"));
  console.log(`CRASH: ${error.message.split("\n")[0]}`);
  process.exit(1);
});
