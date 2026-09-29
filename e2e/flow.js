const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
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

  // --- create ---
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();

  await page.locator("#amount").fill("12.5");
  await dialog.locator('[data-slot="select-trigger"]').click();
  await page
    .locator('[data-slot="select-content"] [role="option"]')
    .filter({ hasText: "Groceries" })
    .first()
    .click();
  await page.locator("#note").fill("Weekly shop");
  await dialog.getByRole("button", { name: "Add transaction" }).click();

  await page
    .getByText("Weekly shop")
    .waitFor()
    .catch(() => {});
  const created =
    (await page.getByText("Groceries").count()) > 0 &&
    (await page.getByText("Weekly shop").count()) > 0;
  check("create transaction", created);

  // --- persistence across reload ---
  await page.reload();
  await page
    .getByText("Weekly shop")
    .waitFor()
    .catch(() => {});
  check(
    "persists after reload (IndexedDB)",
    (await page.getByText("Weekly shop").count()) > 0,
  );

  // --- edit (prefill + save) ---
  const row = page.getByText("Weekly shop").locator("..").locator("..");
  await row.getByRole("button", { name: "Transaction actions" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.waitFor();
  const prefilled = await page.locator("#amount").inputValue();
  check("edit form prefills amount", prefilled === "12.5", `got "${prefilled}"`);
  await page.locator("#amount").fill("42.75");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByText(/\$42\.75/)
    .waitFor()
    .catch(() => {});
  check("edit saves new amount", (await page.getByText(/\$42\.75/).count()) > 0);

  // --- validation ---
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog2 = page.getByRole("dialog");
  await dialog2.waitFor();
  await dialog2.getByRole("button", { name: "Add transaction" }).click();
  check(
    "empty amount shows validation error",
    (await page.getByText("Enter an amount").count()) > 0,
  );
  await page.keyboard.press("Escape");
  await dialog2.waitFor({ state: "detached" }).catch(() => {});

  // --- filters ---
  await page.getByRole("button", { name: "Income", exact: true }).click();
  check(
    "income filter hides expenses",
    (await page.getByText("No transactions found").count()) > 0,
  );
  await page.getByRole("button", { name: "Clear" }).click();
  await page
    .getByText("Weekly shop")
    .waitFor()
    .catch(() => {});
  check(
    "clear filters restores list",
    (await page.getByText("Weekly shop").count()) > 0,
  );

  // --- delete ---
  const row2 = page.getByText("Weekly shop").locator("..").locator("..");
  await row2.getByRole("button", { name: "Transaction actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.waitFor();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await page
    .getByText("Weekly shop")
    .waitFor({ state: "detached" })
    .catch(() => {});
  check(
    "delete removes transaction",
    (await page.getByText("Weekly shop").count()) === 0,
  );

  // --- dashboard ---
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  check(
    "dashboard renders summary cards",
    (await page.getByText("Balance").count()) > 0,
  );

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})();
