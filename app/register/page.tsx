"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Salad } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const json = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok) {
        setError(json.error ?? "注册失败，请稍后重试")
        return
      }

      router.push("/login")
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
            <Salad className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建账号</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">开始追踪你的每日饮食</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="name">
                昵称
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="你的名字"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="至少 6 位"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-semibold py-2.5 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                "注 册"
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          已有账号？{" "}
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </main>
  )
}
