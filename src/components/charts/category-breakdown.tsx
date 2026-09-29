"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/format";

export interface CategorySlice {
  id: string;
  name: string;
  color: string;
  amount: number;
}

interface CategoryBreakdownProps {
  slices: CategorySlice[];
  currency: string;
}

export default function CategoryBreakdown({
  slices,
  currency,
}: CategoryBreakdownProps) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value, name) => [formatMoney(Number(value), currency), name]}
            />
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={1.5}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.id} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="grid min-w-40 flex-1 gap-1.5">
        {slices.map((slice) => (
          <li key={slice.id} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate">{slice.name}</span>
            <span className="text-muted-foreground tabular-nums">
              {total > 0 ? Math.round((slice.amount / total) * 100) : 0}%
            </span>
            <span className="font-medium tabular-nums">
              {formatMoney(slice.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
