const { chromium } = require("playwright");

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
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

  await page.goto(`${BASE}/salary`);
  await page.getByRole("heading", { name: "Salary" }).waitFor();
  await page.getByRole("button", { name: "New salary record" }).first().waitFor();

  check(
    "empty state on first visit",
    (await page.getByText("No salary records yet").count()) > 0,
  );

  // --- validation ---
  await page.getByRole("button", { name: "New salary record" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Save record" }).click();
  check(
    "empty label shows validation error",
    (await page.getByText("Enter a label").count()) > 0,
  );

  // --- fill the payslip ---
  await page.locator("#salary-label").fill("November salary");
  await page.locator("#salary-gross").fill("25000");

  await page.getByRole("button", { name: "Overtime" }).click();
  await page.getByLabel("Allowance amount").last().fill("2000");

  for (const preset of ["Withholding tax", "SSS", "PhilHealth", "Pag-IBIG"]) {
    await page.getByRole("button", { name: preset }).click();
  }
  const amounts = ["2500", "1200", "600", "200"];
  const deductionInputs = page.getByLabel("Deduction amount");
  for (let i = 0; i < amounts.length; i += 1) {
    await deductionInputs.nth(i).fill(amounts[i]);
  }

  const dialogText = await dialog.textContent();
  check(
    "live net preview computes",
    dialogText.includes("₱22,500.00"),
    dialogText.slice(-120).replace(/\s+/g, " "),
  );

  await dialog.getByRole("button", { name: "Save record" }).click();
  await dialog.waitFor({ state: "detached" }).catch(() => {});
  await page
    .getByText("Salary record saved")
    .waitFor()
    .catch(() => {});
  check(
    "record saved toast",
    (await page.getByText("Salary record saved").count()) > 0,
  );

  // --- breakdown rendered ---
  const main = await page.locator("main").textContent();
  check(
    "card shows label and gross in pesos",
    main.includes("November salary") && main.includes("₱25,000.00"),
  );
  check(
    "card shows additions and deduction totals",
    main.includes("+₱2,000.00") && main.includes("−₱4,500.00"),
    "",
  );
  check("card shows net pay", main.includes("₱22,500.00"));

  // --- persists across reload ---
  await page.reload();
  await page.getByRole("heading", { name: "Salary" }).waitFor();
  await page
    .getByText("November salary")
    .waitFor()
    .catch(() => {});
  const afterReload = await page.locator("main").textContent();
  check("record persists after reload", afterReload.includes("₱22,500.00"));

  // --- edit recomputes ---
  await page.getByRole("button", { name: "November salary actions" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.waitFor();
  const prefilledGross = await page.locator("#salary-gross").inputValue();
  check(
    "edit prefills gross pay",
    prefilledGross === "25000",
    `got "${prefilledGross}"`,
  );
  await page.locator("#salary-gross").fill("30000");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByText("Salary record updated")
    .waitFor()
    .catch(() => {});
  const edited = await page.locator("main").textContent();
  check("edit recomputes net pay", edited.includes("₱27,500.00"));

  // --- delete ---
  await page.getByRole("button", { name: "November salary actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.waitFor();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await page
    .getByText("Salary record deleted")
    .waitFor()
    .catch(() => {});
  check(
    "delete removes the record",
    (await page.getByText("No salary records yet").count()) > 0,
  );

  await browser.close();

  console.log(results.join("\n"));
  console.log(
    errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : "\nNo browser errors.",
  );
  process.exit(results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0);
})();
