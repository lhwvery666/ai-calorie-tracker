"use client"

import { useState } from "react"
import Image from "next/image"
import { CheckCircle2, Loader2, Flame, XCircle } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FoodItem, FoodAnalysisResult } from "@/app/api/vision/route"

// ── The shape /api/meals still expects (unchanged) ────────────────────────────
export interface EditableFoodAnalysis {
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  portionSize: string
  confidence: number
}

interface AIConfirmationModalProps {
  open: boolean
  imagePreview: string | null
  analysis: FoodAnalysisResult | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onRetake: () => void
  onConfirm: (payload: EditableFoodAnalysis) => Promise<void>
}

export function AIConfirmationModal({
  open,
  imagePreview,
  analysis,
  isSaving,
  onOpenChange,
  onRetake,
  onConfirm,
}: AIConfirmationModalProps) {
  // Local editable copy of items — parent key-prop re-mounts on each new image
  const [items, setItems] = useState<FoodItem[]>(analysis?.items ?? [])

  const totalCalories = Math.round(
    items.reduce((sum, item) => sum + item.calories, 0)
  )

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateItemWeight = (index: number, rawValue: string) => {
    const newWeight = parseFloat(rawValue)
    if (isNaN(newWeight) || newWeight < 0) return
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const newCalories = Math.round((newWeight * item.calories_per_100g) / 100)
        return { ...item, weight_g: newWeight, calories: newCalories }
      })
    )
  }

  const handleConfirm = async () => {
    if (!analysis || items.length === 0) return
    const totalWeight = Math.round(items.reduce((s, i) => s + i.weight_g, 0))
    const payload: EditableFoodAnalysis = {
      foodName: items.map((i) => i.name).join("、"),
      calories: totalCalories,
      protein: 0,
      carbs: 0,
      fat: 0,
      portionSize: `~${totalWeight}g`,
      confidence: 0.9,
    }
    await onConfirm(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 overflow-hidden border-0 rounded-3xl max-h-[92vh] shadow-2xl"
      >
        <div className="bg-[#f2f2f7] dark:bg-zinc-950 overflow-y-auto max-h-[92vh]">

          {/* ── Image preview ── */}
          <div className="relative w-full aspect-[4/3] overflow-hidden">
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt="Food preview"
                fill
                sizes="(max-width: 640px) 100vw, 448px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-sm text-gray-400">
                No image
              </div>
            )}
            {/* Gradient overlay at bottom of image */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f2f2f7] dark:from-zinc-950 to-transparent" />
          </div>

          <div className="px-4 pb-6 space-y-4 -mt-2">

            {/* ── Success badge ── */}
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-semibold">AI identified {items.length} ingredient{items.length !== 1 ? "s" : ""}</p>
            </div>

            {/* ── Total calories hero card ── */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium tracking-wide uppercase">
                  Total Calories
                </p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mt-0.5 tabular-nums transition-all duration-300">
                  {totalCalories}
                  <span className="text-lg font-semibold text-gray-400 dark:text-zinc-500 ml-1">kcal</span>
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                <Flame className="h-7 w-7 text-orange-500" />
              </div>
            </div>

            {/* ── Ingredient list (iOS grouped style) ── */}
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold uppercase tracking-wide px-1 mb-2">
                Ingredients — edit weight to recalculate
              </p>
              <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 px-4 py-3">
                    {/* Left: name */}
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-zinc-100 truncate">
                      {item.name}
                    </span>

                    {/* Center: weight input */}
                    <div className="flex items-center gap-1 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-2.5 py-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={item.weight_g}
                        onChange={(e) => updateItemWeight(index, e.target.value)}
                        className={cn(
                          "w-14 text-center text-sm font-semibold bg-transparent outline-none",
                          "text-gray-900 dark:text-white",
                          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        )}
                      />
                      <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">g</span>
                    </div>

                    {/* Right: calories */}
                    <span className="w-16 text-right text-sm font-semibold text-orange-500 dark:text-orange-400 tabular-nums">
                      {item.calories} <span className="text-xs font-normal text-gray-400">kcal</span>
                    </span>

                    {/* Delete item */}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="group ml-1 shrink-0 text-gray-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors duration-150"
                      aria-label={`Remove ${item.name}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Action buttons ── */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl text-sm font-semibold border-gray-200 dark:border-zinc-700"
                onClick={onRetake}
                disabled={isSaving}
              >
                Retake
              </Button>
              <Button
                type="button"
                className="h-12 rounded-2xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                onClick={handleConfirm}
                disabled={isSaving || items.length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  "Confirm & Log"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
