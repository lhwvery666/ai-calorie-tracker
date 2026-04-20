import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const maxDuration = 60

// ── Gemini ingredient schema ──────────────────────────────────────────────────
interface Ingredient {
  id: string
  name: string
  weight_g: number
  kcal_per_100g: number
}

// ── Frontend-compatible response shape (consumed by AIConfirmationModal) ──────
interface FoodAnalysis {
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  portionSize: string
  confidence: number
}

const PROMPT = `你是一位专业营养师。请仔细分析图片中的所有食物，将每种食材单独拆解列出。
严格按以下 JSON 数组格式返回，不得包含任何 Markdown 标记或解释文字：
[{"id":"随机唯一字符串","name":"食材名称","weight_g":估算重量纯数字,"kcal_per_100g":每100g热量纯数字}]
如果图片中不包含食物，请只返回 []。`

export async function POST(req: NextRequest) {
  try {
    const { image } = (await req.json()) as { image: string }

    if (!image) {
      return NextResponse.json({ error: "缺少 image 字段" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "服务端 GEMINI_API_KEY 未配置" }, { status: 500 })
    }

    // 提取 base64 data（去掉 "data:image/jpeg;base64," 前缀）
    const base64Data = image.startsWith("data:")
      ? image.split(",")[1]
      : image

    // 提取 MIME type（默认 jpeg）
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/)
    const mimeType = (mimeMatch?.[1] ?? "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/heic"
      | "image/heif"

    // ── 调用 Gemini 1.5 Flash ────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    })

    const rawText = result.response.text().trim()

    // ── 解析食材数组 ─────────────────────────────────────────────────────────
    const ingredients = JSON.parse(rawText) as Ingredient[]

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "图片中未检测到食物，请换一张清晰的食物照片" },
        { status: 422 }
      )
    }

    // ── 聚合为前端所需的 FoodAnalysis 格式 ───────────────────────────────────
    const totalKcal = Math.round(
      ingredients.reduce((sum, item) => sum + (item.weight_g * item.kcal_per_100g) / 100, 0)
    )
    const totalWeight = Math.round(
      ingredients.reduce((sum, item) => sum + item.weight_g, 0)
    )
    const foodName = ingredients.map((i) => i.name).join("、")

    const analysis: FoodAnalysis = {
      foodName,
      calories: totalKcal,
      protein: 0,
      carbs: 0,
      fat: 0,
      portionSize: `约 ${totalWeight}g`,
      confidence: 0.9,
    }

    return NextResponse.json({ success: true, data: analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误"
    console.error("[vision] 处理失败:", message)
    return NextResponse.json(
      { error: "服务器内部错误", detail: message },
      { status: 500 }
    )
  }
}
