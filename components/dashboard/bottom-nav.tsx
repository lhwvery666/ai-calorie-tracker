"use client"

import { useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Camera, Home, LineChart, BookOpenText, UserRound, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AIConfirmationModal, type EditableFoodAnalysis } from "@/components/dashboard/ai-confirmation-modal"
import type { FoodAnalysisResult } from "@/app/api/vision/route"
import { cn } from "@/lib/utils"

// ── Timeout-aware fetch wrapper ───────────────────────────────────────────────
function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeout_s: number = 20
): Promise<Response> {
  return Promise.race([
    fetch(input, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("REQUEST_TIMED_OUT")), timeout_s * 1000)
    ),
  ])
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}


function NavItem({ icon, label, active = false, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
        active
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSavingMeal, setIsSavingMeal] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [pendingAnalysis, setPendingAnalysis] = useState<FoodAnalysisResult | null>(null)

  const resetPendingState = () => {
    setIsConfirmOpen(false)
    setPendingImagePreview(null)
    setPendingAnalysis(null)
  }

  const handleRetake = () => {
    resetPendingState()
    // Small delay so the modal finishes closing before the picker opens
    setTimeout(() => fileInputRef.current?.click(), 150)
  }

  const handleConfirmSave = async (payload: EditableFoodAnalysis) => {
    setIsSavingMeal(true)
    try {
      const saveRes = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const saveJson = (await saveRes.json()) as { success?: boolean; error?: string }
      if (!saveRes.ok || !saveJson.success) {
        throw new Error(saveJson.error ?? "保存失败，请稍后重试")
      }
      resetPendingState()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误"
      alert(`保存失败：${message}`)
    } finally {
      setIsSavingMeal(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input immediately so the same file can be re-selected later
    e.target.value = ""

    setIsAnalyzing(true)

    // Convert the image File to a Base64 Data URL via FileReader
    const reader = new FileReader()
    reader.onload = async () => {
      const base64String = reader.result as string

      try {
        // Step 1: AI vision recognition（20s 超时兜底）
        const visionRes = await fetchWithTimeout(
          "/api/vision",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64String }),
          },
          20
        )

        const visionJson = (await visionRes.json()) as {
          success: boolean
          data: FoodAnalysisResult
          error?: string
        }

        if (!visionRes.ok || !visionJson.success) {
          throw new Error(visionJson.error ?? "AI 识别失败，请稍后重试")
        }

        // Step 2: Show confirmation modal — user may edit fields before saving
        setPendingImagePreview(base64String)
        setPendingAnalysis(visionJson.data)
        setIsConfirmOpen(true)
      } catch (err) {
        if (err instanceof Error && err.message === "REQUEST_TIMED_OUT") {
          toast.error("响应太久了，请检查网络并重新上传试一试。")
        } else {
          const message = err instanceof Error ? err.message : "未知错误"
          alert(`操作失败：${message}`)
        }
      } finally {
        setIsAnalyzing(false)
      }
    }

    reader.onerror = () => {
      alert("图片读取失败，请重试")
      setIsAnalyzing(false)
    }

    reader.readAsDataURL(file)
  }

  return (
    <>
      {/* Hidden file input + FAB — 仅首页显示 */}
      {pathname === "/" && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Floating Action Button */}
          <div className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex justify-center pointer-events-auto">
              <Button
                size="icon"
                disabled={isAnalyzing || isSavingMeal}
                onClick={() => !isAnalyzing && !isSavingMeal && fileInputRef.current?.click()}
                className={cn(
                  "h-16 w-16 rounded-full text-white shadow-lg transition-all duration-200",
                  isAnalyzing
                    ? "bg-emerald-400 shadow-emerald-400/30 cursor-not-allowed scale-95"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105"
                )}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Camera className="h-7 w-7" />
                )}
                <span className="sr-only">{isAnalyzing ? "AI 识别中..." : "拍照记录"}</span>
              </Button>
            </div>
          </div>
        </>
      )}

      {/*
        Bottom Navigation Bar
        Mobile  : fixed full-width bar at the very bottom
        Desktop : floating centered pill (Dock) lifted 24px from the bottom
        
        Architecture: outer div handles fixed positioning + centering;
        inner nav carries the visual styles. `pointer-events-none` on the
        outer div ensures the transparent gap above the pill on desktop
        never intercepts clicks on page content.
      */}
      <div className="fixed inset-x-0 bottom-0 md:bottom-6 z-40 flex justify-center pointer-events-none">
        <nav className={cn(
          "pointer-events-auto",
          // Mobile — full-width bar
          "w-full max-w-md",
          "bg-white dark:bg-zinc-900",
          "border-t border-gray-200 dark:border-zinc-800",
          "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]",
          // Desktop — floating pill / Dock
          "md:w-auto md:max-w-none",
          "md:rounded-full md:border md:border-t",
          "md:border-gray-200 dark:md:border-zinc-700",
          "md:px-6 md:shadow-2xl",
        )}>
          <div className="flex items-center justify-around md:justify-center md:gap-2 py-2">
            <NavItem
              icon={<Home className="h-6 w-6" />}
              label="首页"
              active={pathname === "/"}
              onClick={() => router.push("/")}
            />
            <NavItem
              icon={<LineChart className="h-6 w-6" />}
              label="统计"
              active={pathname === "/stats"}
              onClick={() => router.push("/stats")}
            />
            {/* Spacer for FAB — only needed on home/mobile */}
            {pathname === "/" && <div className="w-16 md:hidden" />}
            <NavItem
              icon={<BookOpenText className="h-6 w-6" />}
              label="食谱"
              active={pathname === "/recipes"}
              onClick={() => router.push("/recipes")}
            />
            <NavItem
              icon={<UserRound className="h-6 w-6" />}
              label="我的"
              active={pathname === "/settings"}
              onClick={() => router.push("/settings")}
            />
          </div>
        </nav>
      </div>
      {/* Confirmation modal — 仅首页挂载 */}
      {pathname === "/" && (
        <AIConfirmationModal
          key={pendingImagePreview ?? "idle"}
          open={isConfirmOpen}
          imagePreview={pendingImagePreview}
          analysis={pendingAnalysis}
          isSaving={isSavingMeal}
          onOpenChange={(open) => {
            // Prevent closing mid-save; otherwise allow backdrop/ESC dismiss
            if (!isSavingMeal) {
              if (!open) resetPendingState()
              else setIsConfirmOpen(true)
            }
          }}
          onRetake={handleRetake}
          onConfirm={handleConfirmSave}
        />
      )}
    </>
  )
}
