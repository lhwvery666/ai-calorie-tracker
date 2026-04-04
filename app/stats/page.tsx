import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BottomNav } from "@/components/dashboard/bottom-nav"
import { StatsChart } from "@/components/dashboard/stats-chart"
import { TrendingUp, Flame, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Build a "MM/DD" label for a given Date
function formatDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${m}/${d}`
}

export default async function StatsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, targetKcal: true, age: true, weight: true, height: true, gender: true },
  })
  if (!user) redirect("/login")

  // Onboarding guard — same as homepage
  if (!user.age || !user.weight || !user.height || !user.gender) redirect("/settings")

  // Build the 7-day window: 00:00 seven days ago → now
  const now = new Date()
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6) // inclusive of today

  let meals: Array<{ calories: number; createdAt: Date }> = []
  try {
    meals = await prisma.meal.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { calories: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })
  } catch (error) {
    console.error("[STATS_PAGE] Failed to fetch meals:", error)
    // Graceful degradation — render empty chart rather than crash
  }

  // Aggregate calories by day (keyed on "MM/DD")
  const calsByDay = new Map<string, number>()
  for (const meal of meals) {
    const key = formatDay(meal.createdAt)
    calsByDay.set(key, (calsByDay.get(key) ?? 0) + meal.calories)
  }

  // Build complete 7-day array, filling missing days with 0
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sevenDaysAgo)
    day.setDate(sevenDaysAgo.getDate() + i)
    const label = formatDay(day)
    return { date: label, calories: calsByDay.get(label) ?? 0 }
  })

  // Summary stats
  const totalCals = chartData.reduce((s, d) => s + d.calories, 0)
  const avgCals = Math.round(totalCals / 7)
  const activeDays = chartData.filter((d) => d.calories > 0).length
  const targetDiff = avgCals - user.targetKcal

  return (
    <div className="mx-auto min-h-screen relative bg-white dark:bg-zinc-900 max-w-md border-x border-gray-200 dark:border-zinc-800 md:max-w-4xl md:border-x-0 md:p-6 md:pb-24">

      {/* Page Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md dark:bg-zinc-900/90 border-b border-gray-100 dark:border-zinc-800 px-4 py-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">饮食统计</h1>
        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">近 7 天</span>
      </div>

      <main className="p-4 md:pt-8 space-y-4 md:space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Daily Average */}
          <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <Flame className="h-5 w-5 text-orange-500 mb-1" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {avgCals.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">日均热量</span>
            </CardContent>
          </Card>

          {/* vs Target */}
          <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <Target className="h-5 w-5 text-emerald-500 mb-1" />
              <span
                className={`text-xl font-bold ${
                  targetDiff > 0
                    ? "text-rose-500 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {targetDiff > 0 ? "+" : ""}
                {targetDiff.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">vs 目标</span>
            </CardContent>
          </Card>

          {/* Active Days */}
          <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <TrendingUp className="h-5 w-5 text-blue-500 mb-1" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {activeDays}
                <span className="text-sm font-normal text-gray-400"> /7</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">记录天数</span>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart Card */}
        <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>每日热量摄入 (kcal)</span>
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                目标 {user.targetKcal.toLocaleString()} kcal
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <StatsChart data={chartData} targetKcal={user.targetKcal} />
          </CardContent>
        </Card>

        {/* Daily Breakdown List */}
        <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              每日明细
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-gray-100 dark:divide-zinc-800">
            {[...chartData].reverse().map((day) => {
              const pct = Math.min(Math.round((day.calories / user.targetKcal) * 100), 100)
              const over = day.calories > user.targetKcal
              return (
                <div key={day.date} className="py-3 flex items-center gap-3">
                  <span className="w-12 text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                    {day.date}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        over ? "bg-rose-400" : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={`w-20 text-right text-sm font-semibold shrink-0 ${
                      day.calories === 0
                        ? "text-gray-300 dark:text-zinc-600"
                        : over
                        ? "text-rose-500 dark:text-rose-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {day.calories === 0 ? "— " : `${day.calories.toLocaleString()} `}
                    <span className="text-xs font-normal text-gray-400">kcal</span>
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

      </main>

      <BottomNav />
    </div>
  )
}
