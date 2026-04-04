"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

interface DayData {
  date: string   // e.g. "03/28"
  calories: number
}

interface StatsChartProps {
  data: DayData[]
  targetKcal: number
}

// Custom Tooltip bubble
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 shadow-lg px-4 py-2 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200">{label}</p>
      <p className="text-emerald-600 dark:text-emerald-400 font-bold">
        {payload[0].value.toLocaleString()} kcal
      </p>
    </div>
  )
}

export function StatsChart({ data, targetKcal }: StatsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgba(0,0,0,0.06)"
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
        {/* Target calorie reference line */}
        <ReferenceLine
          y={targetKcal}
          stroke="#10b981"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          label={{
            value: "目标",
            position: "insideTopRight",
            fontSize: 11,
            fill: "#10b981",
          }}
        />
        <Bar
          dataKey="calories"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
