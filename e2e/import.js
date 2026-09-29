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
  return Promise.all(
    ["Categories", "Transactions", "Budget limits", "Salary records"].map(
      async (label) => {
        const row = dialog.locator("dt", { hasText: label }).locator("+ dd");
        return row.textContent().then((text) => Number(text?.trim()));
      },
    ),
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

  // --- real import file ---
  dialog = await openImport(page);
  await page.getByTestId("import-file").setInputFiles(FILE);
  await dialog.getByText("Transactions", { exact: true }).waitFor();
  const counts = await summaryCounts(dialog);
  check(
    "file summary counts",
    counts[0] === 6 && counts[1] === 11 && counts[2] === 6 && counts[3] === 4,
    JSON.stringify(counts),
  );

  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByText(/Imported 11 transactions/).waitFor({ timeout: 15000 });
  check("import toast reports 11 transactions", true);
  await page
    .getByRole("dialog")
    .waitFor({ state: "detached" })
    .catch(() => {});

  await page.getByText("Utang kay Tatay").waitFor({ timeout: 10000 });
  check(
    "transactions list shows imported entries",
    (await page.getByText("Utang kay Tatay").count()) > 0 &&
      (await page.getByText("Passport Photos & Laminate ID").count()) > 0,
  );

  // --- budgets page reflects the imported limits ---
  await page.goto(`${BASE}/budgets`);
  await page.getByRole("heading", { name: "Budgets" }).waitFor();
  await page
    .getByText("Debts")
    .first()
    .waitFor({ timeout: 10000 })
    .catch(() => {});
  const budgetsText = await page.locator("main").textContent();
  check(
    "imported budget limits shown",
    budgetsText.includes("₱4,000.00") && budgetsText.includes("₱2,000.00"),
    budgetsText.slice(0, 0),
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
  await page.getByText(/Imported 0 transactions/).waitFor({ timeout: 15000 });
  check("re-import skips existing entries", true);

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
