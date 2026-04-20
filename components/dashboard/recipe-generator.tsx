"use client"

import { useState, useEffect } from "react"
import { Sparkles, Loader2, ChefHat, RefreshCw, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface RecipeGeneratorProps {
  remainingKcal: number
}

const RECIPE_CACHE_KEY = "calorie_ai_recipe_cache"

export function RecipeGenerator({ remainingKcal }: RecipeGeneratorProps) {
  const [recipe, setRecipe] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 组件挂载时从 localStorage 恢复上次的食谱
  useEffect(() => {
    try {
      const cached = localStorage.getItem(RECIPE_CACHE_KEY)
      if (cached) setRecipe(cached)
    } catch {
      // localStorage 不可用时静默失败
    }
  }, [])

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)
    setRecipe(null)

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remainingKcal }),
      })

      const json = (await res.json()) as { success?: boolean; recipe?: string; error?: string }

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "食谱生成失败，请稍后重试")
      }

      const recipeText = json.recipe ?? ""
      setRecipe(recipeText)
      // 仅存纯文本，无图片字段，安全写入缓存
      try {
        localStorage.setItem(RECIPE_CACHE_KEY, recipeText)
      } catch {
        // 存储空间不足时静默失败
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误")
    } finally {
      setIsLoading(false)
    }
  }

  const isOverBudget = remainingKcal <= 0

  return (
    <div className="space-y-5">
      {/* Remaining Kcal Banner */}
      <Card
        className={cn(
          "border-0 shadow-sm",
          isOverBudget
            ? "bg-rose-50 dark:bg-rose-950/20"
            : "bg-emerald-50 dark:bg-emerald-950/20"
        )}
      >
        <CardContent className="py-5 flex items-center gap-4">
          <div
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-full shrink-0",
              isOverBudget
                ? "bg-rose-100 dark:bg-rose-900/40"
                : "bg-emerald-100 dark:bg-emerald-900/40"
            )}
          >
            <Flame
              className={cn(
                "h-6 w-6",
                isOverBudget
                  ? "text-rose-500 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">今日剩余热量</p>
            <p
              className={cn(
                "text-2xl font-bold",
                isOverBudget
                  ? "text-rose-500 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isOverBudget ? "已超标" : `${remainingKcal.toLocaleString()} kcal`}
            </p>
            {isOverBudget && (
              <p className="text-xs text-rose-400 dark:text-rose-500 mt-0.5">
                AI 会为你推荐低卡小食～
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isLoading}
        className={cn(
          "w-full h-14 text-base font-semibold shadow-md transition-all duration-200",
          isLoading
            ? "bg-emerald-400 cursor-not-allowed shadow-emerald-400/20 scale-[0.98]"
            : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.01]",
          "text-white"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            主厨正在思考中…
          </>
        ) : recipe ? (
          <>
            <RefreshCw className="mr-2 h-5 w-5" />
            换一个食谱
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            让 AI 为我定制一餐
          </>
        )}
      </Button>

      {/* Error State */}
      {error && (
        <p className="text-center text-sm text-rose-500 dark:text-rose-400">{error}</p>
      )}

      {/* Recipe Result Card */}
      {recipe && !isLoading && (
        <Card className="border-emerald-100 dark:border-emerald-900/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <ChefHat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              AI 主厨推荐
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {recipe}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
