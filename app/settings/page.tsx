"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Loader2, UserRound } from "lucide-react"
import { BottomNav } from "@/components/dashboard/bottom-nav"
import { cn } from "@/lib/utils"

// ── Option definitions ────────────────────────────────────────────────────────

type Gender        = "male" | "female"
type ActivityLevel = "sedentary" | "light" | "moderate" | "active"
type Goal          = "lose" | "maintain" | "gain"

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary", label: "久坐",   desc: "几乎不运动" },
  { value: "light",     label: "轻度",   desc: "每周 1-3 次" },
  { value: "moderate",  label: "中度",   desc: "每周 3-5 次" },
  { value: "active",    label: "重度",   desc: "每天运动" },
]

const GOAL_OPTIONS: { value: Goal; label: string; emoji: string }[] = [
  { value: "lose",     label: "减脂", emoji: "🔥" },
  { value: "maintain", label: "维持", emoji: "⚖️" },
  { value: "gain",     label: "增肌", emoji: "💪" },
]

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  gender:        Gender | ""
  age:           string
  height:        string
  weight:        string
  activityLevel: ActivityLevel | ""
  goal:          Goal | ""
}

const EMPTY_FORM: FormState = {
  gender: "", age: "", height: "", weight: "", activityLevel: "", goal: "",
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">
      {children}
    </h2>
  )
}

function NumberInput({
  label, unit, value, placeholder, onChange, disabled,
}: {
  label: string; unit: string; value: string; placeholder: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 pr-12 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-zinc-500 pointer-events-none">
          {unit}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [isFetching, setFetching] = useState(true)
  const [isLoading, setLoading]   = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Pre-fill from the server on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        setForm({
          gender:        data.gender        ?? "",
          age:           data.age?.toString()    ?? "",
          height:        data.height?.toString()  ?? "",
          weight:        data.weight?.toString()  ?? "",
          activityLevel: data.activityLevel  ?? "",
          goal:          data.goal           ?? "",
        })
      })
      .catch(() => {/* silent — user just starts with blank form */})
      .finally(() => setFetching(false))
  }, [])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender:        form.gender,
          age:           Number(form.age),
          height:        Number(form.height),
          weight:        Number(form.weight),
          activityLevel: form.activityLevel,
          goal:          form.goal,
        }),
      })
      const json = (await res.json()) as { success?: boolean; data?: { targetKcal: number }; error?: string }
      if (!res.ok || !json.success) throw new Error(json.error ?? "保存失败")

      setIsEditing(false)
      alert(`✅ 设置已保存！你的每日目标热量为 ${json.data?.targetKcal} kcal`)
      router.push("/")
      router.refresh()
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : "未知错误"}`)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto min-h-screen relative bg-white dark:bg-zinc-900 max-w-md border-x border-gray-200 dark:border-zinc-800 md:max-w-4xl md:border-x-0 md:pb-24">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2 px-4 py-4">
        <UserRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">个人设置</h1>
      </header>

      {isFetching ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-4 py-6 space-y-8">

          {/* ── Gender ── */}
          <section>
            <SectionTitle>性别</SectionTitle>
            <div className={cn("grid grid-cols-2 gap-3", !isEditing && "pointer-events-none opacity-80")}>
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", g)}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-medium transition-all",
                    form.gender === g
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  )}
                >
                  {g === "male" ? "👦 男" : "👧 女"}
                </button>
              ))}
            </div>
          </section>

          {/* ── Body metrics ── */}
          <section>
            <SectionTitle>身体数据</SectionTitle>
            <div className="space-y-3">
              <NumberInput label="年龄"    unit="岁" value={form.age}    placeholder="25"   onChange={(v) => set("age",    v)} disabled={!isEditing} />
              <div className="flex gap-3">
                <NumberInput label="身高" unit="cm" value={form.height} placeholder="170"  onChange={(v) => set("height", v)} disabled={!isEditing} />
                <NumberInput label="体重" unit="kg" value={form.weight} placeholder="65"   onChange={(v) => set("weight", v)} disabled={!isEditing} />
              </div>
            </div>
          </section>

          {/* ── Activity level ── */}
          <section>
            <SectionTitle>活动水平</SectionTitle>
            <div className={cn("grid grid-cols-2 gap-3", !isEditing && "pointer-events-none opacity-80")}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("activityLevel", opt.value)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-all",
                    form.activityLevel === opt.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-gray-300"
                  )}
                >
                  <span className={cn(
                    "block text-sm font-medium",
                    form.activityLevel === opt.value
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-800 dark:text-gray-200"
                  )}>
                    {opt.label}
                  </span>
                  <span className="block text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Goal ── */}
          <section>
            <SectionTitle>目标</SectionTitle>
            <div className={cn("grid grid-cols-3 gap-3", !isEditing && "pointer-events-none opacity-80")}>
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("goal", opt.value)}
                  className={cn(
                    "rounded-xl border py-3 flex flex-col items-center gap-1 transition-all",
                    form.goal === opt.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-gray-300"
                  )}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className={cn(
                    "text-sm font-medium",
                    form.goal === opt.value
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-700 dark:text-gray-300"
                  )}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Submit / Unlock ── */}
          {isEditing ? (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-semibold py-3 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />保存中...</>
              ) : (
                "保存并计算目标热量"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              🔓 解锁并修改资料
            </button>
          )}
        </form>
      )}

      {/* ── Logout — outside the form, at the very bottom ── */}
      <div className="px-4 pb-40 pt-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium py-3 text-sm transition-colors"
        >
          退出登录
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
