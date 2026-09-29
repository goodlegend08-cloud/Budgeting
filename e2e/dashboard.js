const { chromium } = require("playwright");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const results = [];
const errors = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function addTransaction(page, amount, category, note) {
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.locator("#amount").fill(amount);
  await dialog.locator('[data-slot="select-trigger"]').click();
  await page
    .locator('[data-slot="select-content"] [role="option"]')
    .filter({ hasText: category })
    .first()
    .click();
  await page.locator("#note").fill(note);
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await dialog.waitFor({ state: "detached" }).catch(() => {});
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
  await page.getByRole("button", { name: "Add transaction" }).first().waitFor();

  // --- fresh state: empty chart placeholders ---
  const emptyPlaceholders = await page
    .getByText("Nothing recorded yet for this month.")
    .count();
  check(
    "fresh month shows empty chart placeholders",
    emptyPlaceholders >= 2,
    `count=${emptyPlaceholders}`,
  );

  const monthLabel = await page
    .locator("h1 + div + p, p")
    .filter({ hasText: /Overview of .+ \d{4}/ })
    .count();
  check("month shown in header", monthLabel > 0);

  // --- add spending ---
  await addTransaction(page, "120", "Groceries", "Big shop");
  await page.waitForTimeout(300);
  await addTransaction(page, "250", "Dining", "Dinner out");
  await page.waitForTimeout(300);

  // --- charts render ---
  await page
    .locator("svg.recharts-surface")
    .first()
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  const chartCount = await page.locator("svg.recharts-surface").count();
  check("both charts render", chartCount >= 2, `recharts surfaces=${chartCount}`);

  // --- legend shows categories with amounts ---
  const hasGroceries = await page.getByText("Groceries").count();
  const hasDining = await page.getByText("Dining").count();
  check("category breakdown lists both categories", hasGroceries > 0 && hasDining > 0);

  const legendHasAmount = await page.getByText("₱120.00").count();
  check("legend shows amount", legendHasAmount > 0, `₱120.00 count=${legendHasAmount}`);

  // --- summary cards (month-filtered) ---
  const spentCard = page.locator('[data-slot="card"]').filter({ hasText: "Spent" });
  const spentText = await spentCard
    .first()
    .innerText()
    .catch(() => "");
  check(
    "summary shows month spend",
    spentText.includes("₱370.00"),
    `got "${spentText.replace(/\n/g, " ")}"`,
  );

  // --- recent activity lists both ---
  const recentHasShop = await page.getByText("Big shop").count();
  const recentHasDinner = await page.getByText("Dinner out").count();
  check(
    "recent activity lists month entries",
    recentHasShop > 0 && recentHasDinner > 0,
  );

  // --- spend-over-time has data (area path) ---
  const areaPath = await page
    .locator(
      "svg.recharts-surface path.recharts-area-area, svg.recharts-surface .recharts-area-area",
    )
    .count();
  check("spend-over-time renders an area", areaPath > 0, `area paths=${areaPath}`);

  // --- month switcher: next month empties the dashboard ---
  await page.getByRole("button", { name: "Next month" }).click();
  await page.waitForTimeout(300);
  const nextEmpty = await page
    .getByText("Nothing recorded yet for this month.")
    .count();
  check("next month shows empty charts", nextEmpty >= 2, `count=${nextEmpty}`);
  const nextLabel = await page.getByText(/Overview of .+ 2026/).count();
  check("next month label shown", nextLabel > 0, `count=${nextLabel}`);

  const nextSpent = await page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Spent" })
    .first()
    .innerText()
    .catch(() => "");
  check(
    "next month summary is zero",
    nextSpent.includes("₱0.00"),
    `got "${nextSpent.replace(/\n/g, " ")}"`,
  );

  // --- back to current month (Today) ---
  await page.getByRole("button", { name: "Today" }).click();
  await page.waitForTimeout(300);
  const backEmpty = await page
    .getByText("Nothing recorded yet for this month.")
    .count();
  check(
    "Today returns to month with data",
    backEmpty === 0,
    `empty placeholders=${backEmpty}`,
  );
  const backSpent = await page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Spent" })
    .first()
    .innerText()
    .catch(() => "");
  check(
    "Today restores spend total",
    backSpent.includes("₱370.00"),
    `got "${backSpent.replace(/\n/g, " ")}"`,
  );

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})();
