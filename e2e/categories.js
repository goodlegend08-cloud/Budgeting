const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function hasToast(page, text) {
  const texts = await page.locator("[data-sonner-toast]").allTextContents();
  return texts.some((t) => t.includes(text));
}

async function openMenu(page, categoryName) {
  await page.getByRole("button", { name: `${categoryName} actions` }).click();
}

async function openForm(page) {
  await page.getByRole("button", { name: "New category" }).first().click();
  await page.getByRole("dialog").waitFor();
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });

  await page.goto(`${BASE}/categories`);
  await page.getByRole("heading", { name: "Categories", exact: true }).waitFor();
  await page
    .getByText("Groceries")
    .first()
    .waitFor()
    .catch(() => {});
  check(
    "seeds categories",
    (await page.getByText("Groceries").count()) > 0 &&
      (await page.getByText("Salary").count()) > 0,
  );

  // --- create ---
  await openForm(page);
  await page.locator("#category-name").fill("Pets");
  await page.getByRole("button", { name: "Icon 🐾" }).click();
  await page.locator("#category-limit").fill("75");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create category" })
    .click();
  await page
    .getByText("Pets")
    .first()
    .waitFor()
    .catch(() => {});
  const created =
    (await page.getByText("Pets").count()) > 0 &&
    (await page.getByText("$75.00/month").count()) > 0;
  check("create category with monthly limit", created);

  // --- duplicate name rejected ---
  await openForm(page);
  await page.locator("#category-name").fill("pets");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create category" })
    .click();
  await page.waitForTimeout(300);
  const dupToast = await hasToast(page, "already exists");
  check(
    "duplicate name rejected with toast",
    dupToast,
    JSON.stringify(await page.locator("[data-sonner-toast]").allTextContents()),
  );
  await page
    .getByRole("dialog")
    .waitFor()
    .catch(() => {});
  await page.keyboard.press("Escape");

  // --- edit updates limit ---
  await page
    .getByRole("dialog")
    .waitFor({ state: "detached" })
    .catch(() => {});
  await openMenu(page, "Pets");
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.waitFor();
  const prefilledName = await page.locator("#category-name").inputValue();
  check("edit form prefills name", prefilledName === "Pets", `got "${prefilledName}"`);
  await page.locator("#category-limit").fill("120");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByText("$120.00/month")
    .waitFor()
    .catch(() => {});
  check("edit saves new limit", (await page.getByText("$120.00/month").count()) > 0);

  // --- new category available in transaction form ---
  await page.goto(`${BASE}/transactions`);
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const txDialog = page.getByRole("dialog");
  await txDialog.waitFor();
  await page.locator("#amount").fill("25");
  await txDialog.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-content"]').waitFor();
  const petsOption = page
    .locator('[data-slot="select-content"] [role="option"]')
    .filter({ hasText: "Pets" });
  const offersPets = (await petsOption.count()) > 0;
  check("category offered in transaction form", offersPets);
  await petsOption.first().click();
  await page.locator("#note").fill("Vet visit");
  await txDialog.getByRole("button", { name: "Add transaction" }).click();
  await page
    .getByText("Vet visit")
    .waitFor()
    .catch(() => {});
  check(
    "transaction created with new category",
    (await page.getByText("Vet visit").count()) > 0,
  );

  // --- delete blocked while in use ---
  await page.goto(`${BASE}/categories`);
  await page.getByRole("heading", { name: "Categories", exact: true }).waitFor();
  await openMenu(page, "Pets");
  const deleteItem = page.getByRole("menuitem", { name: /Delete/ });
  const deleteLabel = await deleteItem.textContent();
  const deleteDisabled = await deleteItem.getAttribute("data-disabled");
  check(
    "delete disabled while category has entries",
    deleteItem.count() === 0 ||
      deleteDisabled !== null ||
      deleteLabel.includes("has entries"),
    `label="${deleteLabel}"`,
  );
  await page.keyboard.press("Escape");

  // --- archive hides from picker but keeps label on transactions ---
  await openMenu(page, "Pets");
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.waitForTimeout(300);
  const petsCard = page.locator('[data-slot="card"]').filter({ hasText: "Pets" });
  const badgeShown =
    (await petsCard.getByText("Archived", { exact: true }).count()) > 0;
  check("archived category shows badge", badgeShown);

  await page.goto(`${BASE}/transactions`);
  await page
    .getByText("Vet visit")
    .first()
    .waitFor()
    .catch(() => {});
  const listStillLabels = (await page.getByText("Pets").count()) > 0;
  check("archived category still labels its transactions", listStillLabels);

  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const txDialog2 = page.getByRole("dialog");
  await txDialog2.waitFor();
  await txDialog2.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-content"]').waitFor();
  const options = await page
    .locator('[data-slot="select-content"] [role="option"]')
    .allTextContents();
  await page.keyboard.press("Escape");
  check(
    "archived category hidden from picker",
    !options.some((text) => text.includes("Pets")),
    JSON.stringify(options.slice(0, 5)),
  );

  // --- restore ---
  await page.goto(`${BASE}/categories`);
  await page.getByRole("heading", { name: "Categories", exact: true }).waitFor();
  await openMenu(page, "Pets");
  await page.getByRole("menuitem", { name: "Restore" }).click();
  await page.waitForTimeout(300);
  const restored =
    (await petsCard.getByText("Archived", { exact: true }).count()) === 0;
  check("restore brings category back", restored);

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})();
