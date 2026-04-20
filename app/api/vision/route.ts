import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const maxDuration = 60

// ── Shared data types (mirrored in ai-confirmation-modal.tsx) ─────────────────
export interface FoodItem {
  name: string
  weight_g: number
  calories_per_100g: number
  calories: number
}

export interface FoodAnalysisResult {
  items: FoodItem[]
  total_calories: number
}

const PROMPT = `你是一位专业营养师。请仔细分析图片中所有食物，将每种食材单独拆解列出，估算重量与热量。
严格按以下 JSON 格式返回，绝对不能包含任何 Markdown 标记或解释文字：
{"items":[{"name":"食材名称","weight_g":估算重量纯数字,"calories_per_100g":每100g热量纯数字,"calories":当前重量对应热量纯数字}],"total_calories":所有食材热量加总纯数字}
如果图片中不包含食物，请返回 {"items":[],"total_calories":0}。`

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
    const base64Data = image.startsWith("data:") ? image.split(",")[1] : image

    // 提取 MIME type（默认 jpeg）
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/)
    const mimeType = (mimeMatch?.[1] ?? "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/heic"
      | "image/heif"

    // ── 调用 Gemini ──────────────────────────────────────────────────────────
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
      generationConfig: { responseMimeType: "application/json" },
    })

    const rawText = result.response.text().trim()

    // Strip any Markdown fences the model may still emit despite responseMimeType
    const cleanedText = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    let parsed: FoodAnalysisResult
    try {
      parsed = JSON.parse(cleanedText) as FoodAnalysisResult
    } catch (parseErr) {
      console.error("[vision] JSON parse failed. Raw text:", cleanedText, parseErr)
      return NextResponse.json(
        { success: false, error: "AI response format error — please try again." },
        { status: 422 }
      )
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No food detected. Please use a clearer photo." },
        { status: 422 }
      )
    }

    // 以防模型漏算 total_calories，在后端校正一次
    const total_calories = Math.round(
      parsed.items.reduce((sum, item) => sum + item.calories, 0)
    )

    return NextResponse.json({
      success: true,
      data: { items: parsed.items, total_calories },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[vision] Request failed:", message)
    return NextResponse.json(
      { success: false, error: "Server error. Please try again.", detail: message },
      { status: 500 }
    )
  }
}
