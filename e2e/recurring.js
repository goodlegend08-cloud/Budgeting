const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function fillForm(page, { name, amount, category, frequency, start }) {
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.locator("#recurring-name").fill(name);
  await page.locator("#recurring-amount").fill(amount);

  const [categoryTrigger, frequencyTrigger] = await dialog
    .locator('[data-slot="select-trigger"]')
    .all();

  await categoryTrigger.click();
  await page
    .locator('[data-slot="select-content"] [role="option"]')
    .filter({ hasText: category })
    .first()
    .click();

  await frequencyTrigger.click();
  await page
    .locator('[data-slot="select-content"] [role="option"]')
    .filter({ hasText: frequency, exact: true })
    .first()
    .click();

  if (start) await page.locator("#recurring-start").fill(start);
  return dialog;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(BASE);
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByRole("link", { name: "Recurring" }).click();
  await page.getByRole("heading", { name: "Recurring" }).waitFor();

  check(
    "empty state on first visit",
    (await page.getByText("No recurring items yet").count()) > 0,
  );

  // --- create monthly item starting today ---
  await page.getByRole("button", { name: "New recurring item" }).first().click();
  const dialog = await fillForm(page, {
    name: "Netflix",
    amount: "9.99",
    category: "Fun",
    frequency: "Monthly",
    start: daysAgo(0),
  });
  await dialog.getByRole("button", { name: "Create recurring item" }).click();
  await dialog.waitFor({ state: "detached" }).catch(() => {});

  await page
    .getByText("Recurring item created")
    .waitFor()
    .catch(() => {});
  check(
    "create toast reports generated occurrence",
    (await page.getByText(/occurrence added to your transactions/).count()) > 0,
  );

  const rowVisible =
    (await page.getByText("Netflix", { exact: true }).count()) > 0 &&
    (await page.getByText(/Monthly · Due in \d+ days/).count()) > 0;
  check("row shows name and next due date", rowVisible);

  // --- generated transaction ---
  await page.getByRole("link", { name: "Transactions" }).click();
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  await page
    .getByText("Netflix", { exact: true })
    .waitFor()
    .catch(() => {});
  const netflixRows = await page.getByText("Netflix", { exact: true }).count();
  check("transaction generated for today", netflixRows === 1, `rows=${netflixRows}`);

  // --- reload: still one row (materialization is idempotent) ---
  await page.reload();
  await page
    .getByText("Netflix", { exact: true })
    .waitFor()
    .catch(() => {});
  await page.waitForTimeout(1000);
  const afterReload = await page.getByText("Netflix", { exact: true }).count();
  check(
    "reload does not duplicate the transaction",
    afterReload === 1,
    `rows=${afterReload}`,
  );

  // --- pause / resume ---
  await page.getByRole("link", { name: "Recurring" }).click();
  await page.getByRole("heading", { name: "Recurring" }).waitFor();
  await page.getByRole("button", { name: "Netflix actions" }).click();
  await page.getByRole("menuitem", { name: "Pause" }).click();
  await page
    .getByText("Recurring item paused")
    .waitFor()
    .catch(() => {});
  check(
    "pause shows badge",
    (await page.getByText("Paused", { exact: true }).count()) > 0,
  );

  await page.reload();
  await page.getByRole("heading", { name: "Recurring" }).waitFor();
  await page
    .getByText("Netflix", { exact: true })
    .waitFor()
    .catch(() => {});
  const pausedAfterReload =
    (await page.getByText("Paused", { exact: true }).count()) > 0;
  check("paused state persists", pausedAfterReload);

  await page.getByRole("button", { name: "Netflix actions" }).click();
  await page.getByRole("menuitem", { name: "Resume" }).click();
  await page
    .getByText("Recurring item resumed")
    .waitFor()
    .catch(() => {});
  check(
    "resume clears badge",
    (await page.getByText("Paused", { exact: true }).count()) === 0,
  );

  // --- edit amount: future occurrences use it, existing txn unchanged ---
  await page.getByRole("button", { name: "Netflix actions" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.waitFor();
  const prefilled = await page.locator("#recurring-amount").inputValue();
  check("edit prefills amount", prefilled === "9.99", `got "${prefilled}"`);
  await page.locator("#recurring-amount").fill("12.99");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByText("Recurring item updated")
    .waitFor()
    .catch(() => {});
  check(
    "edit saves new amount",
    (await page.getByText("Recurring item updated").count()) > 0,
  );

  // --- backdated weekly item generates a catch-up batch ---
  await page.getByRole("button", { name: "New recurring item" }).first().click();
  const dialog2 = await fillForm(page, {
    name: "Gym membership",
    amount: "30",
    category: "Health",
    frequency: "Weekly",
    start: daysAgo(7),
  });
  await dialog2.getByRole("button", { name: "Create recurring item" }).click();
  await dialog2.waitFor({ state: "detached" }).catch(() => {});
  await page
    .getByText("2 occurrences added to your transactions")
    .waitFor()
    .catch(() => {});
  const batchToast = (await page.getByText(/2 occurrences added/).count()) > 0;
  check("backdated start generates catch-up batch", batchToast);

  await page.getByRole("link", { name: "Transactions" }).click();
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  await page
    .getByText("Gym membership", { exact: true })
    .waitFor()
    .catch(() => {});
  const gymRows = await page.getByText("Gym membership", { exact: true }).count();
  check("weekly item created 2 transactions", gymRows === 2, `rows=${gymRows}`);

  // --- delete keeps transactions ---
  await page.getByRole("link", { name: "Recurring" }).click();
  await page.getByRole("heading", { name: "Recurring" }).waitFor();
  await page.getByRole("button", { name: "Netflix actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.waitFor();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await page
    .getByText("Recurring item deleted")
    .waitFor()
    .catch(() => {});
  const netflixGone = (await page.getByText("Netflix", { exact: true }).count()) === 0;
  check("delete removes the recurring row", netflixGone);

  await page.getByRole("link", { name: "Transactions" }).click();
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  const keptRows = await page.getByText("Netflix", { exact: true }).count();
  check("delete keeps generated transactions", keptRows === 1, `rows=${keptRows}`);

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})();
