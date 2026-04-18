// Pure Server Component — no hooks, no client-only APIs needed
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface MacroProgressProps {
  label: string
  current: number
  target: number
  color: string
}

function MacroProgress({ label, current, target, color }: MacroProgressProps) {
  const percentage = Math.min((current / target) * 100, 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {current}g / {target}g
      </span>
    </div>
  )
}

interface DailySummaryProps {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  targetKcal: number
}

export function DailySummary({
  totalCalories,
  totalProtein,
  totalCarbs,
  totalFat,
  targetKcal,
}: DailySummaryProps) {
  // TODO: replace with real activity data when fitness integration is added
  const burned    = 0
  const eaten     = totalCalories
  const remaining = Math.max(targetKcal - (eaten - burned), 0)
  const progress  = Math.min(((eaten - burned) / targetKcal) * 100, 100)

  // Format today's date in Chinese — e.g. "2026年4月9日"
  const todayLabel = new Date().toLocaleDateString("zh-CN", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  })

  return (
    <Card className="mx-4 md:mx-0 shadow-md border-gray-100 dark:border-zinc-800">
      {/* Date header — sits above the ring */}
      <CardHeader className="pb-0 pt-4 px-6">
        <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {todayLabel}
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Circular Progress Ring */}
        <div className="flex flex-col items-center mb-6">
          {/* Stats above ring */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              已摄入: <span className="font-semibold text-gray-900 dark:text-white">{eaten}</span>
            </span>
            <span className="text-gray-300 dark:text-zinc-600">|</span>
            <span className="text-gray-500 dark:text-gray-400">
              已消耗: <span className="font-semibold text-gray-900 dark:text-white">{burned}</span>
            </span>
          </div>

          {/* SVG Circle Progress */}
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-zinc-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.64} 264`}
                className="text-emerald-500 transition-all duration-500"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {remaining.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">千卡剩余</span>
            </div>
          </div>
        </div>

        {/* Macros Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <MacroProgress label="蛋白质" current={totalProtein} target={120} color="bg-rose-500" />
          <MacroProgress label="碳水"   current={totalCarbs}   target={200} color="bg-blue-500" />
          <MacroProgress label="脂肪"   current={totalFat}     target={60}  color="bg-amber-500" />
        </div>
      </CardContent>
    </Card>
  )
}
