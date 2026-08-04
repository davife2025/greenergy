"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface UsagePoint {
  date: string;
  kwh: number;
}

export function UsageChart({ data }: { data: UsagePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-500">
        No usage data yet — link an account and generate demo data to see a chart here.
      </div>
    );
  }

  return (
    <div className="h-56 w-full rounded-xl border border-neutral-100 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#F2F2F1" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#8a8a86" }}
            tickFormatter={(d: string) => d.slice(5)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8a8a86" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            formatter={(value: number) => [`${value} kWh`, "Usage"]}
            labelFormatter={(label: string) => label}
            contentStyle={{ borderRadius: 8, border: "1px solid #eee", fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey="kwh"
            stroke="#1D9E75"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
