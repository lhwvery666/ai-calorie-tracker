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

// Concise prompt — fewer tokens = faster response
const PROMPT = `Nutritionist. Analyze food in image. Be concise. Return JSON immediately without extra descriptions. Skip reasoning.
Output ONLY this JSON (no markdown, no explanation):
{"items":[{"name":"ingredient","weight_g":number,"calories_per_100g":number,"calories":number}],"total_calories":number}
No food detected? Return {"items":[],"total_calories":0}.`

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
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" })

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
