const { chromium } = require("playwright");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const currentMonthLabel = new Date().toLocaleString("en-US", {
  month: "long",
  year: "numeric",
});

async function addTransaction(page, { amount, category, note }) {
  await page.goto(`${BASE}/transactions`);
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.locator("#amount").fill(String(amount));
  await dialog.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-content"]').waitFor();
  await page
    .locator('[data-slot="select-content"] [role="option"]')
    .filter({ hasText: category })
    .first()
    .click();
  await page.locator("#note").fill(note);
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await dialog.waitFor({ state: "detached" });
  await page.getByText(note).first().waitFor();
}

async function openLimitDialog(page, categoryName) {
  await page.getByRole("button", { name: `Set limit for ${categoryName}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  return dialog;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(`${BASE}/budgets`);
  await page.getByRole("heading", { name: "Budgets" }).waitFor();
  await page
    .getByRole("button", { name: "Set limit for Groceries" })
    .waitFor()
    .catch(() => {});
  check(
    "budgets page shows current month + empty state",
    (await page.getByText(currentMonthLabel).count()) > 0 &&
      (await page.getByText("No limits set for this month").count()) > 0,
    currentMonthLabel,
  );

  // --- set a limit ---
  const dialog = await openLimitDialog(page, "Groceries");
  await page.locator("#budget-limit").fill("300");
  await dialog.getByRole("button", { name: "Save" }).click();
  await dialog.waitFor({ state: "detached" });
  await page
    .getByText("₱300.00")
    .first()
    .waitFor()
    .catch(() => {});
  check(
    "limit applied and shows full amount left",
    (await page.getByText("₱0.00 of ₱300.00").count()) > 0 &&
      (await page.getByText("₱300.00").count()) > 0,
  );

  // --- persists across reload ---
  await page.reload();
  await page
    .getByText("₱0.00 of ₱300.00")
    .waitFor()
    .catch(() => {});
  check(
    "limit persists after reload",
    (await page.getByText("₱0.00 of ₱300.00").count()) > 0,
  );

  // --- spend inside and outside the budget ---
  await addTransaction(page, { amount: 120, category: "Groceries", note: "Market" });
  await addTransaction(page, { amount: 250, category: "Dining", note: "Dinner" });
  await page.goto(`${BASE}/budgets`);
  await page
    .getByText("₱120.00 of ₱300.00")
    .waitFor()
    .catch(() => {});
  const summaryText = await page.locator("main").textContent();
  check(
    "summary: budgeted spent, left, unbudgeted note",
    summaryText.includes("₱120.00 of ₱300.00") &&
      summaryText.includes("₱180.00") &&
      summaryText.includes("Plus ₱250.00 outside budgets"),
    summaryText.slice(0, 0),
  );
  check(
    "daily allowance shown for current month",
    /\/day for the next \d+ days/.test(summaryText),
  );

  // --- overspend highlight ---
  await addTransaction(page, { amount: 250, category: "Groceries", note: "Bulk run" });
  await page.goto(`${BASE}/budgets`);
  await page
    .getByText("Over by ₱70.00")
    .waitFor()
    .catch(() => {});
  const overText = await page.locator("main").textContent();
  check(
    "overspend highlighted",
    overText.includes("Over by ₱70.00") && overText.includes("₱370.00 of ₱300.00"),
  );

  // --- month switcher ---
  await page.getByRole("button", { name: "Next month" }).click();
  const nextMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1,
  ).toLocaleString("en-US", { month: "long", year: "numeric" });
  await page
    .getByText(nextMonth)
    .first()
    .waitFor()
    .catch(() => {});
  const nextText = await page.locator("main").textContent();
  check(
    "next month has its own (empty) budget",
    nextText.includes(nextMonth) &&
      nextText.includes("No limits set for this month") &&
      !nextText.includes("Over by"),
    nextMonth,
  );
  check(
    "Today button returns to current month",
    (await page.getByRole("button", { name: "Today" }).count()) > 0,
  );
  await page.getByRole("button", { name: "Today" }).click();
  await page
    .getByText("Over by ₱70.00")
    .waitFor()
    .catch(() => {});
  check(
    "Today restores current month view",
    (await page.getByText("Over by ₱70.00").count()) > 0,
  );

  // --- revert to category default ---
  const dialog2 = await openLimitDialog(page, "Groceries");
  check(
    "override dialog offers revert",
    (await dialog2.getByRole("button", { name: "Use category default" }).count()) > 0,
  );
  await dialog2.getByRole("button", { name: "Use category default" }).click();
  await dialog2.waitFor({ state: "detached" });
  check(
    "revert removes the monthly override",
    (await page.getByText("₱370.00 spent · no limit").count()) > 0,
  );

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})();
