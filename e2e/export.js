const { chromium } = require("playwright");
const path = require("path");
const XLSX = require("xlsx");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const FILE = path.join(__dirname, "..", "public", "budget-import-2026.json");
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function seed(page) {
  await page.goto(`${BASE}/transactions`);
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  await page.getByRole("button", { name: "Import", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.getByTestId("import-file").setInputFiles(FILE);
  await dialog.getByText("Transactions", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByText(/Imported 12 transactions/).waitFor({ timeout: 15000 });
  await dialog.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
}

async function downloadMonth(page, month) {
  await page.getByRole("button", { name: "Export", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.getByTestId("export-month").fill(month);
  const pending = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download .xlsx" }).click();
  const download = await pending;
  const file = await download.path();
  return { name: download.suggestedFilename(), workbook: XLSX.readFile(file) };
}

function rows(workbook, sheet) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await seed(page);

  // --- September workbook ---
  const september = await downloadMonth(page, "2026-09");
  check(
    "september filename",
    september.name === "budget-export-2026-09.xlsx",
    september.name,
  );
  check(
    "workbook has all sheets",
    ["Summary", "Transactions", "Budgets", "Salary", "Categories", "Recurring"].every(
      (name) => september.workbook.SheetNames.includes(name),
    ),
    september.workbook.SheetNames.join(","),
  );
  check(
    "september transactions count",
    rows(september.workbook, "Transactions").length - 1 === 11,
  );
  const budgetCount = rows(september.workbook, "Budgets").length - 1;
  check(
    "september budgets: 5 limits + unbudgeted spend",
    budgetCount === 6,
    `rows=${budgetCount}`,
  );
  check("september salary count", rows(september.workbook, "Salary").length - 1 === 1);
  const categoryNames = rows(september.workbook, "Categories")
    .slice(1)
    .map((row) => row[0]);
  check(
    "categories sheet includes imported ones",
    [
      "Debts",
      "Savings",
      "Necessities",
      "Fees & Documents",
      "Transport",
      "Shopping",
    ].every((name) => categoryNames.includes(name)),
    `${categoryNames.length} categories`,
  );

  const txSheet = rows(september.workbook, "Transactions");
  check(
    "september sheet holds only september rows",
    txSheet.slice(1).every((row) => String(row[0]).startsWith("2026-09")),
    JSON.stringify(txSheet[1] ?? []),
  );
  const budgetSheet = rows(september.workbook, "Budgets");
  const debtsRow = budgetSheet.find((row) => row[0] === "Debts");
  check(
    "budget sheet shows the debts limit",
    Boolean(debtsRow) && debtsRow[1] === 5000 && debtsRow[3] === 0,
    JSON.stringify(debtsRow ?? []),
  );

  // --- October workbook ---
  const october = await downloadMonth(page, "2026-10");
  check(
    "october filename",
    october.name === "budget-export-2026-10.xlsx",
    october.name,
  );
  check(
    "october transactions count",
    rows(october.workbook, "Transactions").length - 1 === 1,
  );
  check("october budgets count", rows(october.workbook, "Budgets").length - 1 === 1);
  check("october salary count", rows(october.workbook, "Salary").length - 1 === 1);

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
