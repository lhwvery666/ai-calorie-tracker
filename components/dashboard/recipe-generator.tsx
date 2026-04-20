"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles,
  Loader2,
  ChefHat,
  RefreshCw,
  Flame,
  Bookmark,
  BookmarkCheck,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Filter,
  UtensilsCrossed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { RecipeData } from "@/app/api/recipes/route"

/* ─────────────────────────────────────────────────────────── types ── */

export interface SavedRecipe extends RecipeData {
  id: string
  savedAt: number
  remainingKcalAtSave: number
}

type PriceFilter = "all" | "budget" | "moderate" | "premium"
type DifficultyFilter = "all" | "easy" | "medium" | "hard"

/* ─────────────────────────────────────────────────────── constants ── */

const RECIPE_CACHE_KEY = "calorie_ai_recipe_cache"
const RECIPE_FAVORITES_KEY = "calorie_ai_recipe_favorites"

const PRICE_LABEL: Record<RecipeData["price"], string> = {
  budget: "$ Budget",
  moderate: "$$ Moderate",
  premium: "$$$ Premium",
}
const PRICE_COLOR: Record<RecipeData["price"], string> = {
  budget: "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  premium: "bg-violet-50 text-violet-700 border-violet-200",
}

const DIFF_LABEL: Record<RecipeData["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
}
const DIFF_COLOR: Record<RecipeData["difficulty"], string> = {
  easy: "bg-sky-50 text-sky-700 border-sky-200",
  medium: "bg-orange-50 text-orange-700 border-orange-200",
  hard: "bg-rose-50 text-rose-700 border-rose-200",
}

/* ──────────────────────────────────────────────────── sub-components ── */

function PriceBadge({ price }: { price: RecipeData["price"] }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", PRICE_COLOR[price])}>
      {PRICE_LABEL[price]}
    </span>
  )
}

function DiffBadge({ difficulty }: { difficulty: RecipeData["difficulty"] }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", DIFF_COLOR[difficulty])}>
      {DIFF_LABEL[difficulty]}
    </span>
  )
}

/* ─────────────────────────────────────────── recipe card (expanded) ── */

function RecipeCard({
  recipe,
  isSaved,
  onToggleSave,
}: {
  recipe: RecipeData
  isSaved: boolean
  onToggleSave: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <Card className="border-emerald-100 dark:border-emerald-900/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0 mt-0.5">
            <ChefHat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white truncate">
                {recipe.title}
              </CardTitle>
              <button
                onClick={onToggleSave}
                className={cn(
                  "shrink-0 p-1.5 rounded-full transition-all duration-200",
                  isSaved
                    ? "text-amber-500 bg-amber-50 dark:bg-amber-900/30"
                    : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                )}
                title={isSaved ? "Remove from favorites" : "Save to favorites"}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="flex items-center gap-1 text-xs font-medium text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                <Flame className="h-3 w-3" />
                {recipe.estimatedKcal} kcal
              </span>
              <PriceBadge price={recipe.price} />
              <DiffBadge difficulty={recipe.difficulty} />
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed pl-0">
          {recipe.description}
        </p>
      </CardHeader>

      {/* Collapsible body */}
      <CardContent className="pt-0">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-3 hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Show details
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Ingredients */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Ingredients
              </h4>
              <ul className="space-y-1">
                {recipe.ingredients.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Steps */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Steps
              </h4>
              <ol className="space-y-2">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step.replace(/^\d+[.、]\s*/, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────────────────── saved recipe mini-card ── */

function SavedRecipeCard({
  recipe,
  onDelete,
}: {
  recipe: SavedRecipe
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm overflow-hidden">
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 shrink-0">
          <BookmarkCheck className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{recipe.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-xs text-rose-500 font-medium">{recipe.estimatedKcal} kcal</span>
            <PriceBadge price={recipe.price} />
            <DiffBadge difficulty={recipe.difficulty} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {open ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-50 dark:border-zinc-700 space-y-3 animate-in fade-in duration-200">
          <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 leading-relaxed">{recipe.description}</p>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Ingredients</p>
            <ul className="space-y-0.5">
              {recipe.ingredients.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Steps</p>
            <ol className="space-y-1">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step.replace(/^\d+[.、]\s*/, "")}</span>
                </li>
              ))}
            </ol>
          </div>

          <button
            onClick={() => onDelete(recipe.id)}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-600 transition-colors mt-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove from favorites
          </button>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────── main component ── */

interface RecipeGeneratorProps {
  remainingKcal: number
}

export function RecipeGenerator({ remainingKcal }: RecipeGeneratorProps) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all")
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>("all")

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECIPE_FAVORITES_KEY)
      if (raw) setSavedRecipes(JSON.parse(raw) as SavedRecipe[])
    } catch {
      /* ignore */
    }
  }, [])

  // Restore last generated recipe from cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(RECIPE_CACHE_KEY)
      if (cached) setRecipe(JSON.parse(cached) as RecipeData)
    } catch {
      /* ignore */
    }
  }, [])

  const persistFavorites = useCallback((list: SavedRecipe[]) => {
    setSavedRecipes(list)
    try {
      localStorage.setItem(RECIPE_FAVORITES_KEY, JSON.stringify(list))
    } catch {
      /* ignore */
    }
  }, [])

  const isSaved = recipe
    ? savedRecipes.some(
        (r) => r.title === recipe.title && r.estimatedKcal === recipe.estimatedKcal
      )
    : false

  const handleToggleSave = () => {
    if (!recipe) return

    if (isSaved) {
      const updated = savedRecipes.filter(
        (r) => !(r.title === recipe.title && r.estimatedKcal === recipe.estimatedKcal)
      )
      persistFavorites(updated)
      toast.success("Removed from favorites")
    } else {
      const newEntry: SavedRecipe = {
        ...recipe,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        savedAt: Date.now(),
        remainingKcalAtSave: remainingKcal,
      }
      persistFavorites([newEntry, ...savedRecipes])
      toast.success("Saved to favorites!")
    }
  }

  const handleDeleteFavorite = (id: string) => {
    persistFavorites(savedRecipes.filter((r) => r.id !== id))
    toast.success("Removed from favorites")
  }

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

      const json = (await res.json()) as {
        success?: boolean
        recipe?: RecipeData
        error?: string
      }

      if (!res.ok || !json.success || !json.recipe) {
        throw new Error(json.error ?? "Failed to generate recipe. Please try again.")
      }

      setRecipe(json.recipe)
      try {
        localStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify(json.recipe))
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  const isOverBudget = remainingKcal <= 0

  // Filtered favorites
  const filteredFavorites = savedRecipes.filter((r) => {
    if (priceFilter !== "all" && r.price !== priceFilter) return false
    if (diffFilter !== "all" && r.difficulty !== diffFilter) return false
    return true
  })

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
            <p className="text-sm text-gray-500 dark:text-gray-400">Remaining Today</p>
            <p
              className={cn(
                "text-2xl font-bold",
                isOverBudget
                  ? "text-rose-500 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isOverBudget ? "Over Budget" : `${remainingKcal.toLocaleString()} kcal`}
            </p>
            {isOverBudget && (
              <p className="text-xs text-rose-400 dark:text-rose-500 mt-0.5">
                AI will suggest light, low-cal options for you
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
            Chef is thinking…
          </>
        ) : recipe ? (
          <>
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Another Recipe
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Generate My Meal Plan
          </>
        )}
      </Button>

      {/* Error State */}
      {error && (
        <p className="text-center text-sm text-rose-500 dark:text-rose-400">{error}</p>
      )}

      {/* Recipe Result Card */}
      {recipe && !isLoading && (
        <RecipeCard recipe={recipe} isSaved={isSaved} onToggleSave={handleToggleSave} />
      )}

      {/* ─── Favorites Section ─── */}
      <div className="pt-2">
        <button
          onClick={() => setShowFavorites((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30"
        >
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Saved Recipes
            </span>
            {savedRecipes.length > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-500 text-white text-[11px] font-bold px-1">
                {savedRecipes.length}
              </span>
            )}
          </div>
          {showFavorites ? (
            <ChevronUp className="h-4 w-4 text-amber-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-500" />
          )}
        </button>

        {showFavorites && (
          <div className="mt-3 space-y-3 animate-in fade-in duration-300">
            {savedRecipes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No saved recipes yet.</p>
                <p className="text-xs mt-1">Generate a recipe and tap the bookmark icon to save it.</p>
              </div>
            ) : (
              <>
                {/* Filter bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />

                  {/* Price filter */}
                  <div className="flex items-center gap-1">
                    {(["all", "budget", "moderate", "premium"] as PriceFilter[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriceFilter(p)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border transition-all duration-150",
                          priceFilter === p
                            ? "bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900"
                            : "bg-white text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-600 hover:border-gray-400"
                        )}
                      >
                        {p === "all" ? "All $" : PRICE_LABEL[p as RecipeData["price"]]}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <span className="text-gray-200 dark:text-zinc-700">|</span>

                  {/* Difficulty filter */}
                  <div className="flex items-center gap-1">
                    {(["all", "easy", "medium", "hard"] as DifficultyFilter[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDiffFilter(d)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border transition-all duration-150",
                          diffFilter === d
                            ? "bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-900"
                            : "bg-white text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-600 hover:border-gray-400"
                        )}
                      >
                        {d === "all" ? "All Levels" : DIFF_LABEL[d as RecipeData["difficulty"]]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results count */}
                {filteredFavorites.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6">
                    No recipes match these filters.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredFavorites.map((r) => (
                      <SavedRecipeCard key={r.id} recipe={r} onDelete={handleDeleteFavorite} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
