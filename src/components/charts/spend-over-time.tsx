"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

export interface SpendPoint {
  label: string;
  amount: number;
}

interface SpendOverTimeProps {
  points: SpendPoint[];
  currency: string;
}

export default function SpendOverTime({ points, currency }: SpendOverTimeProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.35} />
            <stop
              offset="95%"
              stopColor="var(--color-destructive)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="var(--color-border)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(value: number) => formatMoney(value, currency)}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-border)" }}
          formatter={(value) => [formatMoney(Number(value), currency), "Spent"]}
          labelFormatter={(label) => `Day ${label}`}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--color-destructive)"
          strokeWidth={2}
          fill="url(#spendFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
