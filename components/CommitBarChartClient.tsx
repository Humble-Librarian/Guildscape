"use client"

import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

export default function CommitBarChartClient({ data }: { data: { month: string; commits: number }[] }) {
  const hasData = data.some((d) => d.commits > 0);

  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center text-secondary text-sm">
        No commit data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#4F9CF9" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#4F9CF9" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111827",
            border: "1px solid #1F2937",
            borderRadius: "8px",
            color: "#F3F4F6",
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [`${value} commits`, ""]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(month: any) => `${month}`}
        />
        <Area
          type="monotone"
          dataKey="commits"
          stroke="#4F9CF9"
          strokeWidth={2}
          fill="url(#commitGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#4F9CF9", stroke: "#0A0F1E", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
