"use client"

import { useState } from "react"
import Image from "next/image"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
  analysis: EditableFoodAnalysis | null
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
  // Initialise from the latest analysis; `key` on the parent re-mounts this
  // component each time a new image is analysed, resetting the fields cleanly.
  const [foodName, setFoodName] = useState(analysis?.foodName ?? "")
  const [portionSize, setPortionSize] = useState(analysis?.portionSize || "100g")

  const handleConfirm = async () => {
    if (!analysis) return
    await onConfirm({
      ...analysis,
      foodName: foodName.trim() || analysis.foodName,
      portionSize: portionSize.trim() || analysis.portionSize || "100g",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 overflow-hidden border-0 rounded-2xl"
      >
        <div className="bg-white dark:bg-zinc-900">
          {/* ── Image preview ── */}
          <div className="p-4 pb-0">
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Food preview"
                  fill
                  sizes="(max-width: 640px) 100vw, 448px"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="px-4 pt-4 pb-5 space-y-4">
            {/* Success badge */}
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">AI 识别成功</p>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              {/* Food Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Food Name
                </label>
                <Input
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="请输入食物名称"
                  className="h-10"
                />
              </div>

              {/* Portion */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Portion
                </label>
                <Input
                  value={portionSize}
                  onChange={(e) => setPortionSize(e.target.value)}
                  placeholder="例如 100g"
                  className="h-10"
                />
              </div>

              {/* Calories — read-only display */}
              <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 px-3 py-2.5">
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Calories</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {analysis?.calories ?? 0} kcal
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={onRetake}
                disabled={isSaving}
              >
                Retake
              </Button>
              <Button
                type="button"
                className="h-10 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                onClick={handleConfirm}
                disabled={isSaving || !analysis}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Confirm & Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
