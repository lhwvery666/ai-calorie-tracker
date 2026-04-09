/**
 * load-test.js — AI Calorie Tracker 并发压力测试脚本
 *
 * 用法：
 *   node load-test.js              # 默认：meals 模式，50 并发
 *   node load-test.js vision 10    # vision 模式（真实调 AI），10 并发
 *   node load-test.js meals 100    # meals 模式，100 并发
 *
 * meals 模式：
 *   测试 POST /api/meals（数据库写入吞吐量）。
 *   需要先在浏览器登录，从 DevTools → Application → Cookies 里复制
 *   "next-auth.session-token" 的值，填入下方 SESSION_COOKIE。
 *
 * vision 模式：
 *   测试 POST /api/vision（AI 识别全链路）。
 *   会真实调用智谱 API，请勿用大并发，默认上限 10。
 */

// ─── 配置区 ───────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:3000"

/**
 * 从浏览器 DevTools → Application → Cookies → next-auth.session-token 粘贴到这里。
 * 只有 meals 模式需要；vision 模式不需要登录。
 */
const SESSION_COOKIE = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..GurPsV8ijaWaStj5.pgEGxEAY33CLpqs8a-1LYeYUHTD1iRmUxWamiwHR06NPp2lIYo_iaEjB2A6oQdY9O0HyJL9F0UzhCkmtCyNYPK08NjLAJw_SOICXNwpzFMJjCdoDQvBeJZaEZaAbf6B0npdtTlnouM5ceICBrwYLip59lz-LvsTWHf3Vd5LNqinDexd-jGA9LZjWgyZ1PIMCzaclJ8kmKknWPZ_B0WYWmtzFwVR_KpjPpsx_LMhOvP97EvceY4CJyqTsqdMQ.l13hbFm4FIw4iwO-AFauCA"

/** 模拟的 meals 请求体（符合 /api/meals 接受的字段） */
const MOCK_MEALS_PAYLOAD = [
  { foodName: "红烧肉",   calories: 580, protein: 22.5, carbs: 18.0, fat: 46.0, portionSize: "一碗约250g", confidence: 0.92 },
  { foodName: "白米饭",   calories: 260, protein:  5.1, carbs: 57.0, fat:  0.5, portionSize: "一碗约200g", confidence: 0.98 },
  { foodName: "番茄鸡蛋", calories: 150, protein:  8.2, carbs:  9.0, fat:  8.5, portionSize: "一盘约200g", confidence: 0.95 },
  { foodName: "可乐",     calories: 145, protein:  0.0, carbs: 39.0, fat:  0.0, portionSize: "一罐355ml",  confidence: 0.99 },
  { foodName: "煎饺",     calories: 320, protein: 12.0, carbs: 38.0, fat: 13.0, portionSize: "10个约180g", confidence: 0.88 },
]

/**
 * 1×1 像素白色 JPEG 的 base64（极小，仅用于测试网络/解析路径，不浪费 AI 配额）。
 * vision 模式使用，AI 会尝试识别但结果无意义——这是故意的，目的只是测延迟。
 */
const TINY_BASE64_IMAGE =
  "data:image/jpeg;base64," +
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
  "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wgALCAABAAEBAREA/8QAFAAB" +
  "AAAAAAAAAAAAAAAAAAAJ/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAAAlf/9k="

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 随机从数组里取一个元素 */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/** 用颜色让终端输出更易读（自动降级到无色） */
const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  dim:    "\x1b[2m",
}
const col = (color, str) => `${c[color]}${str}${c.reset}`
const bold = (str) => `${c.bold}${str}${c.reset}`

/** 秒 → 格式化字符串，e.g. "1.234s" or "234ms" */
const fmt = (sec) =>
  sec >= 1 ? `${sec.toFixed(3)}s` : `${(sec * 1000).toFixed(1)}ms`

/** 打印横线分隔符 */
const hr = (char = "─", len = 52) => col("dim", char.repeat(len))

// ─── 单次请求 ─────────────────────────────────────────────────────────────────

/**
 * 向目标 URL 发一次 POST，返回 { ok, status, latency, error? }。
 * 内置 15s 超时，超时视为失败。
 */
async function sendRequest(url, body, headers = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  const start = performance.now()

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const latency = (performance.now() - start) / 1000
    const data = await res.json().catch(() => ({}))

    return {
      ok: res.ok && (data.success !== false),
      status: res.status,
      latency,
      error: res.ok ? null : (data.error ?? `HTTP ${res.status}`),
    }
  } catch (err) {
    const latency = (performance.now() - start) / 1000
    const isTimeout = err.name === "AbortError"
    return {
      ok: false,
      status: isTimeout ? 0 : -1,
      latency,
      error: isTimeout ? "Timeout (>15s)" : err.message,
    }
  } finally {
    clearTimeout(timer)
  }
}

// ─── 统计计算 ─────────────────────────────────────────────────────────────────

function calcStats(results) {
  const latencies = results.map((r) => r.latency)
  const sorted = [...latencies].sort((a, b) => a - b)

  const sum = latencies.reduce((s, v) => s + v, 0)
  const avg = sum / latencies.length

  // P50 / P95 / P99
  const p = (pct) => sorted[Math.floor((pct / 100) * sorted.length)] ?? sorted[sorted.length - 1]

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg,
    p50: p(50),
    p95: p(95),
    p99: p(99),
  }
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

async function main() {
  // 解析命令行参数
  const [, , modeArg = "meals", concArg] = process.argv
  const mode = modeArg.toLowerCase()

  if (mode !== "meals" && mode !== "vision") {
    console.error(`❌  未知模式 "${mode}"，请使用 meals 或 vision`)
    process.exit(1)
  }

  const isMeals  = mode === "meals"
  const maxConc  = isMeals ? 200 : 10   // vision 模式限制上限，避免 API Key 过载
  const defaultC = isMeals ? 50  : 5
  const concurrency = Math.min(parseInt(concArg ?? defaultC, 10) || defaultC, maxConc)

  const endpoint = isMeals ? `${BASE_URL}/api/meals` : `${BASE_URL}/api/vision`

  // meals 模式检查 cookie 是否已填写
  if (isMeals && SESSION_COOKIE === "PASTE_YOUR_SESSION_TOKEN_HERE") {
    console.error([
      "",
      col("red", "  ✖  SESSION_COOKIE 还未填写！"),
      "",
      "  meals 模式需要登录态。请按以下步骤操作：",
      col("dim", "  1. 在浏览器打开 http://localhost:3000 并登录"),
      col("dim", '  2. 打开 DevTools → Application → Cookies → 找到 "next-auth.session-token"'),
      col("dim", "  3. 复制 Value，粘贴到本文件顶部的 SESSION_COOKIE 变量里"),
      "",
      "  或者改用 vision 模式（不需要登录）：",
      col("cyan", "    node load-test.js vision 5"),
      "",
    ].join("\n"))
    process.exit(1)
  }

  // 打印运行参数
  console.log("")
  console.log(hr("═"))
  console.log(bold(`  🚀 AI Calorie Tracker — 并发压力测试`))
  console.log(hr("═"))
  console.log(`  模式       : ${col("cyan", mode.toUpperCase())}`)
  console.log(`  端点       : ${col("dim", endpoint)}`)
  console.log(`  并发数     : ${bold(concurrency)}`)
  if (!isMeals) {
    console.log(col("yellow", `  ⚠  vision 模式会真实调用智谱 AI API，请勿大并发`))
  }
  console.log(hr())
  console.log("")

  // 构建请求任务
  const headers = isMeals
    ? { Cookie: `next-auth.session-token=${SESSION_COOKIE}` }
    : {}

  const tasks = Array.from({ length: concurrency }, (_, i) => {
    const body = isMeals
      ? pick(MOCK_MEALS_PAYLOAD)
      : { image: TINY_BASE64_IMAGE }

    return sendRequest(endpoint, body, headers).then((result) => {
      // 进度点（每完成一个就打一个字符，不换行）
      const dot = result.ok ? col("green", "·") : col("red", "✕")
      process.stdout.write(dot)
      return result
    })
  })

  const wallStart = performance.now()
  const results = await Promise.all(tasks)
  const wallTime = (performance.now() - wallStart) / 1000

  // 换行，结束进度条
  console.log("\n")

  // 计算统计
  const succeeded = results.filter((r) => r.ok)
  const failed    = results.filter((r) => !r.ok)
  const stats     = calcStats(results)

  // 错误明细（最多展示 10 条）
  const errorCounts = {}
  for (const r of failed) {
    const key = r.error ?? "Unknown"
    errorCounts[key] = (errorCounts[key] ?? 0) + 1
  }

  // ── 打印结果 ──────────────────────────────────────────────────────────────
  console.log(hr("═"))
  console.log(bold("  📊 测试结果"))
  console.log(hr("═"))

  console.log(`  总请求数   : ${bold(concurrency)}`)
  console.log(
    `  成功       : ${col("green", bold(succeeded.length))}` +
    `   失败 : ${failed.length > 0 ? col("red", bold(failed.length)) : col("dim", "0")}`
  )
  console.log(`  成功率     : ${bold(((succeeded.length / concurrency) * 100).toFixed(1) + "%")}`)
  console.log(`  总耗时     : ${bold(fmt(wallTime))}  ${col("dim", "(wall-clock，含所有并发)")}`)

  console.log("")
  console.log(hr())
  console.log(bold("  ⏱  延迟分布（所有请求，含失败）"))
  console.log(hr())
  console.log(`  最小 (Min) : ${col("green", fmt(stats.min))}`)
  console.log(`  平均 (Avg) : ${bold(fmt(stats.avg))}`)
  console.log(`  中位 (P50) : ${fmt(stats.p50)}`)
  console.log(`  P95        : ${col("yellow", fmt(stats.p95))}`)
  console.log(`  P99        : ${col("red",    fmt(stats.p99))}`)
  console.log(`  最大 (Max) : ${col("red",    fmt(stats.max))}`)

  if (Object.keys(errorCounts).length > 0) {
    console.log("")
    console.log(hr())
    console.log(bold("  ✖  错误明细"))
    console.log(hr())
    const sorted = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])
    for (const [msg, count] of sorted.slice(0, 10)) {
      console.log(`  ${col("red", `×${count}`)}  ${col("dim", msg)}`)
    }
  }

  console.log(hr("═"))
  console.log("")

  // 非零失败率时以非零退出码结束（方便 CI 判断）
  if (failed.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error(col("red", `\n  致命错误: ${err.message}\n`))
  process.exit(1)
})
