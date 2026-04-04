import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BottomNav } from "@/components/dashboard/bottom-nav"
import { RecipeGenerator } from "@/components/dashboard/recipe-generator"
import { ChefHat } from "lucide-react"

export default async function RecipesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, targetKcal: true, age: true, weight: true, height: true, gender: true },
  })
  if (!user) redirect("/login")

  // Onboarding guard
  if (!user.age || !user.weight || !user.height || !user.gender) redirect("/settings")

  // Fetch today's meals to calculate remaining kcal
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let totalCalories = 0
  try {
    const meals = await prisma.meal.findMany({
      where: { userId: user.id, createdAt: { gte: startOfDay } },
      select: { calories: true },
    })
    totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)
  } catch (error) {
    console.error("[RECIPES_PAGE] Failed to fetch meals:", error)
    // Graceful degradation — remainingKcal defaults to full targetKcal
  }

  // Never go negative — if over budget, pass 0 and let API handle the messaging
  const remainingKcal = Math.max(0, user.targetKcal - totalCalories)

  return (
    <div className="mx-auto min-h-screen relative bg-white dark:bg-zinc-900 max-w-md border-x border-gray-200 dark:border-zinc-800 md:max-w-4xl md:border-x-0 md:pb-24">

      {/* Page Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md dark:bg-zinc-900/90 border-b border-gray-100 dark:border-zinc-800 px-4 py-4 flex items-center gap-2">
        <ChefHat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AI 食谱定制</h1>
        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
          目标 {user.targetKcal.toLocaleString()} kcal
        </span>
      </div>

      {/* Main Content */}
      <main className="p-4 md:p-8 md:max-w-2xl md:mx-auto pb-36 md:pb-40">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">今天还能吃什么？</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            告诉 AI 你的剩余热量，让米其林主厨为你量身定制一餐 🍽️
          </p>
        </div>

        <RecipeGenerator remainingKcal={remainingKcal} />
      </main>

      <BottomNav />
    </div>
  )
}
