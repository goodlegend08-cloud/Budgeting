const { chromium } = require("playwright");
const path = require("path");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const FILE = path.join(__dirname, "..", "public", "budget-import-2026.json");
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function openImport(page) {
  await page.getByRole("button", { name: "Import", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  return dialog;
}

async function summaryCounts(dialog) {
  const labels = [
    "Categories",
    "Transactions",
    "Budget limits",
    "Salary records",
    "Entries to replace",
    "Limits to replace",
  ];
  return Promise.all(
    labels.map(async (label) => {
      const cell = dialog.locator("dt", { hasText: label }).locator("+ dd");
      const found = await cell.count();
      if (!found) return 0;
      const text = await cell.textContent();
      return Number(text?.trim());
    }),
  );
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(`${BASE}/transactions`);
  await page.getByRole("heading", { name: "Transactions" }).waitFor();

  // --- invalid file is rejected ---
  let dialog = await openImport(page);
  await page.getByTestId("import-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not json"),
  });
  const errorShown = await page
    .getByText("That file is not valid JSON")
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  check("invalid JSON shows an error", errorShown);
  check(
    "invalid file cannot be imported",
    (await dialog.getByRole("button", { name: "Import", exact: true }).isDisabled()) ===
      true,
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "detached" });

  // --- version written as a string is accepted ---
  const versionFile = (version) =>
    Buffer.from(
      JSON.stringify({
        version,
        categories: [{ name: "Solo", type: "expense", icon: "📝", color: "#78716c" }],
      }),
    );

  dialog = await openImport(page);
  await page.getByTestId("import-file").setInputFiles({
    name: "version-string.json",
    mimeType: "application/json",
    buffer: versionFile("1.0"),
  });
  await dialog.locator("dt", { hasText: "Categories" }).waitFor({ timeout: 5000 });
  const stringVersionCount = await dialog
    .locator("dt", { hasText: "Categories" })
    .locator("+ dd")
    .textContent();
  check(
    'version "1.0" is accepted',
    stringVersionCount?.trim() === "1" &&
      (await dialog.locator("p.text-destructive").count()) === 0,
    `count=${stringVersionCount?.trim()}`,
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "detached" });

  // --- an unknown version is still rejected, with a readable message ---
  dialog = await openImport(page);
  await page.getByTestId("import-file").setInputFiles({
    name: "version-2.json",
    mimeType: "application/json",
    buffer: versionFile(2),
  });
  const versionRejected = await dialog
    .getByText(/version/i)
    .first()
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  check("version 2 is rejected with a readable error", versionRejected);
  check(
    "unknown version cannot be imported",
    (await dialog.getByRole("button", { name: "Import", exact: true }).isDisabled()) ===
      true,
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "detached" });

  // --- Excel workbook, dashboard (Block) layout ---
  dialog = await openImport(page);
  await page
    .getByTestId("import-file")
    .setInputFiles(path.join(__dirname, "fixtures", "dashboard-sample.xlsx"));
  await dialog.getByText("Transactions", { exact: true }).waitFor({ timeout: 20000 });
  const excelCounts = await summaryCounts(dialog);
  check(
    "excel dashboard workbook counts",
    excelCounts[0] === 6 &&
      excelCounts[1] === 12 &&
      excelCounts[2] === 6 &&
      excelCounts[3] === 4,
    JSON.stringify(excelCounts),
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "detached" });

  // --- Excel workbook, plain table layout ---
  dialog = await openImport(page);
  await page
    .getByTestId("import-file")
    .setInputFiles(path.join(__dirname, "fixtures", "simple-table.xlsx"));
  await dialog.getByText("Transactions", { exact: true }).waitFor({ timeout: 20000 });
  const tableCounts = await summaryCounts(dialog);
  check(
    "excel table workbook counts",
    tableCounts[0] === 4 && tableCounts[1] === 4 && tableCounts[2] === 3,
    JSON.stringify(tableCounts),
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "detached" });

  // --- Excel whose formula cells have no cached values ---
  dialog = await openImport(page);
  await page
    .getByTestId("import-file")
    .setInputFiles(path.join(__dirname, "fixtures", "formula-sample.xlsx"));
  await dialog.getByText("Transactions", { exact: true }).waitFor({ timeout: 20000 });
  const formulaCounts = await summaryCounts(dialog);
  check(
    "excel with uncached formulas still counts salary",
    formulaCounts[0] === 6 &&
      formulaCounts[1] === 12 &&
      formulaCounts[2] === 6 &&
      formulaCounts[3] === 4,
    JSON.stringify(formulaCounts),
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "detached" });

  // --- real import file ---
  dialog = await openImport(page);
  await page.getByTestId("import-file").setInputFiles(FILE);
  await dialog.getByText("Transactions", { exact: true }).waitFor();
  const counts = await summaryCounts(dialog);
  check(
    "file summary counts",
    counts[0] === 6 &&
      counts[1] === 12 &&
      counts[2] === 6 &&
      counts[3] === 4 &&
      counts[4] === 1 &&
      counts[5] === 1,
    JSON.stringify(counts),
  );

  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByText(/Imported 12 transactions/).waitFor({ timeout: 15000 });
  check("import toast reports 12 transactions", true);
  await page
    .getByRole("dialog")
    .waitFor({ state: "detached" })
    .catch(() => {});

  await page.getByText("Utang kay Tatay", { exact: true }).waitFor({
    timeout: 10000,
  });
  check(
    "transactions list shows imported entries",
    (await page.getByText("Utang kay Tatay", { exact: true }).count()) > 0 &&
      (await page.getByText("Additional Utang kay tatay", { exact: true }).count()) >
        0 &&
      (await page.getByText("Passport Photos & Laminate ID", { exact: true }).count()) >
        0,
  );

  // --- budgets page reflects the imported limits ---
  await page.goto(`${BASE}/budgets`);
  await page.getByRole("heading", { name: "Budgets" }).waitFor();
  await page
    .getByText("Fees & Documents")
    .first()
    .waitFor({ timeout: 10000 })
    .catch(() => {});
  const octoberText = await page.locator("main").textContent();
  check(
    "October budget covers the pre-salary spend",
    octoberText.includes("₱300.00") && octoberText.includes("₱100.00"),
    `octoberLimit=${octoberText.includes("₱300.00")}`,
  );

  await page.getByRole("button", { name: "Previous month" }).click();
  await page.getByText("September 2026").first().waitFor({ timeout: 10000 });
  const septemberText = await page.locator("main").textContent();
  check(
    "imported September budget limits shown",
    septemberText.includes("₱5,000.00") &&
      septemberText.includes("₱2,000.00") &&
      septemberText.includes("₱1,500.00") &&
      septemberText.includes("₱10,214.00") &&
      septemberText.includes("Plus ₱200.00 outside budgets"),
    `total=${septemberText.includes("₱10,214.00")}`,
  );

  // --- salary page shows the payroll records ---
  await page.goto(`${BASE}/salary`);
  await page.getByRole("heading", { name: "Salary" }).waitFor();
  await page.getByText("September 2026 Salary").waitFor({ timeout: 10000 });
  const salaryText = await page.locator("main").textContent();
  check(
    "imported salary records shown",
    ["September", "October", "November", "December"].every((month) =>
      salaryText.includes(`${month} 2026 Salary`),
    ) && salaryText.includes("₱15,008.62"),
  );

  // --- re-import is idempotent ---
  await page.goto(`${BASE}/transactions`);
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  dialog = await openImport(page);
  await page.getByTestId("import-file").setInputFiles(FILE);
  await dialog.getByText("Transactions", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await page
    .getByText(/Imported 1 transactions.*\(1 replaced\)/)
    .waitFor({ timeout: 15000 });
  check("re-import replaces changed entries", true);
  check(
    "changed entry exists exactly once after re-import",
    (await page.getByText("Tatak ng Notary", { exact: true }).count()) === 1 &&
      (await page.getByText("12 entries", { exact: true }).count()) > 0,
    `rows=${await page.getByText("Tatak ng Notary", { exact: true }).count()}`,
  );

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})().catch((error) => {
  console.log(results.join("\n"));
  console.log(`CRASH: ${error.message.split("\n")[0]}`);
  const dialogs = [];
  console.log("last toasts/screens:", dialogs.join(", "));
  process.exit(1);
});
