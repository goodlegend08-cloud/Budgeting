import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-20 gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Step({ children }: { children: ReactNode }) {
  return <li className="text-sm leading-6">{children}</li>;
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

const JUMPS = [
  ["getting-started", "Getting started"],
  ["dashboard", "Dashboard"],
  ["transactions", "Transactions"],
  ["budgets", "Budgets"],
  ["salary", "Salary"],
  ["recurring", "Recurring"],
  ["categories", "Categories"],
  ["import", "Import"],
  ["export", "Export"],
  ["data", "Your data"],
  ["faq", "FAQ"],
] as const;

export default function HelpPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Help & Tutorial"
        description="How every part of Budgeting works — follow the steps in order on your first visit."
      />

      <nav className="flex flex-wrap gap-2">
        {JUMPS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section id="getting-started" title="Getting started (first visit)">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ol className="grid list-decimal gap-1.5 pl-5">
              <Step>
                <strong>Categories</strong> — make one for each kind of spend (Food,
                Transport, Utilities…). Optional: give it a default monthly limit.
              </Step>
              <Step>
                <strong>Budgets</strong> — pick a month and set a limit on every
                category you plan to spend on.
              </Step>
              <Step>
                <strong>Transactions</strong> — record spending as it happens, or press{" "}
                <strong>Import</strong> to load a spreadsheet you already keep.
              </Step>
              <Step>
                <strong>Dashboard</strong> — see the month at a glance: spent vs budget,
                the category chart and recent entries.
              </Step>
              <Step>
                <strong>Salary</strong> and <strong>Recurring</strong> — add your
                payslip and any repeating bills so they fill themselves in.
              </Step>
            </ol>
            <Tip>
              Short on time? Skip to step 3 and use Import — categories, budgets and
              salary records come in one go.
            </Tip>
          </CardContent>
        </Card>
      </Section>

      <Section id="dashboard" title="Dashboard">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ul className="grid list-disc gap-1.5 pl-5">
              <Step>Use the month arrows in the header to move between months.</Step>
              <Step>
                Summary cards show what you spent, what you budgeted and what is left
                for that month.
              </Step>
              <Step>
                The chart breaks spending down by category; recent activity lists the
                latest entries.
              </Step>
              <Step>
                An empty month says <em>Nothing recorded yet for this month</em> — that
                is normal before you add data.
              </Step>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section id="transactions" title="Transactions (your ledger)">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ul className="grid list-disc gap-1.5 pl-5">
              <Step>
                <strong>Add transaction</strong> opens a form: amount, category, date
                and an optional note.
              </Step>
              <Step>
                The header shows how many entries match your filters; use the filter row
                to narrow by month, category or search text.
              </Step>
              <Step>
                Every row can be edited (pencil) or deleted (trash) from its menu —
                deletion asks for confirmation first.
              </Step>
              <Step>
                <strong>Export</strong> downloads a month as Excel,{" "}
                <strong>Import</strong> loads data back in (see below).
              </Step>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section id="budgets" title="Budgets (your plan)">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ul className="grid list-disc gap-1.5 pl-5">
              <Step>
                <strong>‹ ›</strong> switch months; <strong>Today</strong> returns to
                the current month.
              </Step>
              <Step>
                Cards show <em>Budget · month</em>, <em>Spent in budgets</em> and{" "}
                <em>Left</em>.
              </Step>
              <Step>
                <em>≈ ₱X/day</em> tells you what you can spend per day until the month
                ends; <em>Plus ₱Y outside budgets</em> counts spending that has no
                limit.
              </Step>
              <Step>
                The pencil on any category sets a limit for that month only —{" "}
                <strong>Use category default</strong> reverts it.
              </Step>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section id="salary" title="Salary (payslips)">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ul className="grid list-disc gap-1.5 pl-5">
              <Step>
                Enter label, pay date and gross pay, then use{" "}
                <strong>+ Add line</strong> or the preset chips (Withholding tax, SSS,
                PhilHealth, Pag-IBIG…) for deductions.
              </Step>
              <Step>
                <strong>Net pay updates live</strong> while you type.
              </Step>
              <Step>
                <strong>Split into 2 paydays — 8th &amp; 23rd</strong> saves two
                half-pay records for that month instead of one (DTR-style paydays). The
                preview shows both amounts before you save. This option appears when
                creating, not when editing.
              </Step>
              <Step>
                The header badge <strong>Next payday</strong> always counts down to the
                next 8th or 23rd.
              </Step>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section id="recurring" title="Recurring (repeating bills)">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ul className="grid list-disc gap-1.5 pl-5">
              <Step>
                Create an item with amount, category, frequency and start date — the
                first transaction is generated right away and the next due date is
                shown.
              </Step>
              <Step>
                A backdated start generates the whole catch-up batch so past months are
                not empty.
              </Step>
              <Step>
                <strong>Pause</strong> stops future generations (a badge shows the
                state); <strong>Resume</strong> restarts them.
              </Step>
              <Step>
                Deleting a recurring item keeps the transactions it already created.
              </Step>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section id="categories" title="Categories">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ul className="grid list-disc gap-1.5 pl-5">
              <Step>Name, icon, colour and an optional default monthly limit.</Step>
              <Step>
                <strong>Archive</strong> hides a category from lists without losing
                history.
              </Step>
              <Step>
                <strong>Delete</strong> is blocked while entries still use it — the
                button reads <em>Delete (has entries)</em>.
              </Step>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section id="import" title="Import (Excel / CSV / JSON)">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ol className="grid list-decimal gap-1.5 pl-5">
              <Step>
                <strong>Transactions → Import</strong> and choose a{" "}
                <code className="rounded bg-muted px-1">.xlsx</code>,{" "}
                <code className="rounded bg-muted px-1">.xls</code>,{" "}
                <code className="rounded bg-muted px-1">.csv</code> or{" "}
                <code className="rounded bg-muted px-1">.json</code> file.
              </Step>
              <Step>
                Check the summary: categories, transactions, budget limits, salary
                records — plus <em>Entries to replace</em> and{" "}
                <em>Limits to replace</em> when a file marks outdated rows.
              </Step>
              <Step>
                Press <strong>Import</strong>. Duplicates are skipped, marked rows are
                replaced, budget limits are updated.
              </Step>
            </ol>
            <Tip>
              Supported layouts: your dashboard workbook (month tabs with Block
              sections) and plain tables with headers like Date · Description · Category
              · Amount (optional Budget column). Everything is parsed inside your
              browser — nothing is uploaded.
            </Tip>
            <p className="text-sm leading-6">
              Errors appear under the file picker and list up to five issues at once (
              <code className="rounded bg-muted px-1">field: message</code>). If you
              edit a row in Excel and re-import, delete the old row first — Excel files
              carry no “replace” list, only JSON exports do.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section id="export" title="Export (download as Excel)">
        <Card>
          <CardContent className="grid gap-2 p-4 text-sm leading-6">
            <ol className="grid list-decimal gap-1.5 pl-5">
              <Step>
                <strong>Transactions → Export</strong>.
              </Step>
              <Step>
                Pick the <strong>month &amp; year</strong> you want.
              </Step>
              <Step>
                Press <strong>Download .xlsx</strong> — the file is named{" "}
                <code className="rounded bg-muted px-1">
                  budget-export-YYYY-MM.xlsx
                </code>
                .
              </Step>
            </ol>
            <p className="text-sm leading-6">The workbook contains six sheets:</p>
            <ul className="grid list-disc gap-1.5 pl-5 text-sm leading-6">
              <Step>
                <strong>Summary</strong> — totals for that month (spent, budgeted, left,
                net pay).
              </Step>
              <Step>
                <strong>Transactions</strong> — date, category, type, amount, note.
              </Step>
              <Step>
                <strong>Budgets</strong> — limit, spent and left per category (including
                spend that had no limit).
              </Step>
              <Step>
                <strong>Salary</strong> — payslips dated that month, with net pay.
              </Step>
              <Step>
                <strong>Categories</strong> — everything, with default limits.
              </Step>
              <Step>
                <strong>Recurring</strong> — repeating items and their next due dates.
              </Step>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section id="data" title="Your data">
        <Card>
          <CardContent className="grid gap-3 p-4 text-sm leading-6">
            <ul className="grid list-disc gap-1.5 pl-5">
              <Step>
                Everything lives in <strong>this browser only</strong> (local database)
                — there is no account and no server copy.
              </Step>
              <Step>
                Clearing site data, or using a different browser or device, means
                starting fresh there.
              </Step>
              <Step>
                <strong>Back up often:</strong> Export your months to Excel and keep the
                files. Re-importing a JSON export restores everything.
              </Step>
              <Step>
                Currency defaults to the peso (₱); amounts display with the narrow peso
                symbol everywhere.
              </Step>
            </ul>
            <p className="text-sm leading-6">
              Sample data file for trying the importer:{" "}
              <Link
                className="font-medium underline underline-offset-4"
                href="/budget-import-2026.json"
              >
                budget-import-2026.json
              </Link>
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section id="faq" title="FAQ">
        <Card>
          <CardContent className="grid gap-3 p-4 text-sm leading-6">
            <div className="grid gap-1">
              <p className="font-medium">
                Why does my budget say “Plus ₱X outside budgets”?
              </p>
              <p className="text-muted-foreground">
                Spending in categories that have no limit for that month. Set a limit
                and it moves into the budgeted totals.
              </p>
            </div>
            <div className="grid gap-1">
              <p className="font-medium">Can I split every payslip into two?</p>
              <p className="text-muted-foreground">
                Yes — tick <em>Split into 2 paydays — 8th &amp; 23rd</em> when creating
                a salary record. Each half is saved as its own record.
              </p>
            </div>
            <div className="grid gap-1">
              <p className="font-medium">Import says “No budget rows found”.</p>
              <p className="text-muted-foreground">
                The workbook needs a label column and an amount column (or the Block
                layout). Check the first rows and adjust headers, then try again.
              </p>
            </div>
            <div className="grid gap-1">
              <p className="font-medium">Re-importing the same file is safe.</p>
              <p className="text-muted-foreground">
                Duplicates are skipped; only rows the file marks for replacement are
                overwritten.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
