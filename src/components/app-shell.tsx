"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknoteIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  RepeatIcon,
  TagsIcon,
  TargetIcon,
  WalletIcon,
} from "lucide-react";
import { ensureSeeded } from "@/lib/db";
import { materializeRecurring } from "@/lib/actions";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Toaster } from "@/components/ui/sonner";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/transactions", label: "Transactions", icon: ReceiptIcon },
  { href: "/budgets", label: "Budgets", icon: TargetIcon },
  { href: "/salary", label: "Salary", icon: BanknoteIcon },
  { href: "/recurring", label: "Recurring", icon: RepeatIcon },
  { href: "/categories", label: "Categories", icon: TagsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  React.useEffect(() => {
    void ensureSeeded().then(() => materializeRecurring());
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 font-heading font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <WalletIcon className="size-4" />
            </span>
            Budgeting
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t py-4">
        <p className="mx-auto w-full max-w-5xl px-4 text-xs text-muted-foreground">
          Data is stored locally in your browser.
        </p>
      </footer>

      <TransactionForm />
      <Toaster position="bottom-right" />
    </div>
  );
}
