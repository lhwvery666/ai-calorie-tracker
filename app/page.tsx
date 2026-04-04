import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { HeaderDateSlider } from "@/components/dashboard/header-date-slider"
import { DailySummary } from "@/components/dashboard/daily-summary"
import { AISuggestion } from "@/components/dashboard/ai-suggestion"
import { MealLog } from "@/components/dashboard/meal-log"
import { BottomNav } from "@/components/dashboard/bottom-nav"

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  // Resolve user — includes body data needed for onboarding guard + calorie target
  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true, targetKcal: true, age: true, weight: true, height: true, gender: true },
  })
  if (!user) redirect("/login")

  // Onboarding guard — new users must complete body-data setup before accessing the dashboard
  if (!user.age || !user.weight || !user.height || !user.gender) redirect("/settings")

  // Today's window: midnight → now (server local time)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Fetch today's meals, newest first
  const meals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay },
    },
    orderBy: { createdAt: "desc" },
  })

  // Aggregate daily nutrition totals (round to 1 decimal for macros)
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)
  const totalProtein  = Math.round(meals.reduce((sum, m) => sum + (m.protein ?? 0), 0) * 10) / 10
  const totalCarbs    = Math.round(meals.reduce((sum, m) => sum + (m.carbs   ?? 0), 0) * 10) / 10
  const totalFat      = Math.round(meals.reduce((sum, m) => sum + (m.fat     ?? 0), 0) * 10) / 10

  // Serialize Date objects — Client Components cannot receive Date instances as props
  const serializedMeals = meals.map((m) => ({
    id:          m.id,
    foodName:    m.foodName,
    calories:    m.calories,
    protein:     m.protein,
    carbs:       m.carbs,
    fat:         m.fat,
    portionSize: m.portionSize,
    mealType:    m.mealType,
    imageUrl:    m.imageUrl,
    createdAt:   m.createdAt.toISOString(),
  }))

  return (
    <div className="mx-auto min-h-screen relative bg-white dark:bg-zinc-900 max-w-md border-x border-gray-200 dark:border-zinc-800 md:max-w-4xl md:border-x-0 md:p-6 md:pb-24">
      {/* Header — full-width sticky bar on all screen sizes */}
      <HeaderDateSlider userName={session.user?.name} />

      {/* Main content — single column on mobile, 12-col grid on desktop */}
      <main className="pt-4 md:pt-8 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-10 md:items-start">

        {/* Left column (fixed 320px) — calorie ring + AI suggestion */}
        <div className="space-y-6">
          <DailySummary
            totalCalories={totalCalories}
            totalProtein={totalProtein}
            totalCarbs={totalCarbs}
            totalFat={totalFat}
            targetKcal={user.targetKcal}
          />
          <AISuggestion
            targetKcal={user.targetKcal}
            consumedKcal={totalCalories}
            meals={serializedMeals}
          />
        </div>

        {/* Right column (fluid) — meal log */}
        <div className="min-w-0">
          <MealLog meals={serializedMeals} />
        </div>

      </main>
      <BottomNav />
    </div>
  )
}
