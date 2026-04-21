import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Vercel Hobby max function duration (seconds)
export const maxDuration = 60

// ── Shared data types ─────────────────────────────────────────────────────────
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

// Concise prompt — fewer output tokens = faster response
const PROMPT = `You are a nutritionist. Analyze every food item visible in the image.
Return ONLY valid JSON — no markdown, no explanation, no reasoning:
{"items":[{"name":"ingredient name","weight_g":number,"calories_per_100g":number,"calories":number}],"total_calories":number}
If no food is detected, return: {"items":[],"total_calories":0}`

export async function POST(req: NextRequest) {
  // ── 1. Parse request ────────────────────────────────────────────────────────
  let image: string
  try {
    const body = (await req.json()) as { image?: string }
    if (!body.image) {
      return NextResponse.json({ success: false, error: "Missing 'image' field in request body." }, { status: 400 })
    }
    image = body.image
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 })
  }

  // ── 2. Validate API key ─────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error("[vision] GEMINI_API_KEY is not set in environment variables.")
    return NextResponse.json({ success: false, error: "Server misconfiguration: API key missing." }, { status: 500 })
  }

  // ── 3. Extract base64 payload and MIME type ─────────────────────────────────
  const base64Data = image.startsWith("data:") ? image.split(",")[1] : image
  const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/)
  const mimeType = (mimeMatch?.[1] ?? "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/heic"
    | "image/heif"

  // ── 4. Call Gemini ──────────────────────────────────────────────────────────
  let rawText: string
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    // gemini-2.0-flash-lite: current fast vision model, replaces deprecated 1.5-flash
    // gemini-2.0-flash: has free tier (1500 req/day). "lite" has quota=0 on free tier.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

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

    rawText = result.response.text().trim()
    console.log("[vision] Raw Gemini response:", rawText.slice(0, 300))
  } catch (geminiErr) {
    // Log every available property so Vercel logs tell us exactly what went wrong
    const name    = geminiErr instanceof Error ? geminiErr.name    : "UnknownError"
    const message = geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
    const status  = (geminiErr as Record<string, unknown>).status  ?? "n/a"
    const stack   = geminiErr instanceof Error ? geminiErr.stack   : ""
    console.error("[vision] Gemini API call failed:")
    console.error("  name   :", name)
    console.error("  message:", message)
    console.error("  status :", status)
    console.error("  stack  :", stack)
    // 429 = quota exceeded — return a user-friendly message
    if (status === 429) {
      return NextResponse.json(
        { success: false, error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: `Gemini API error (${status}): ${message}`,
        detail: { name, status },
      },
      { status: 502 }
    )
  }

  // ── 5. Parse JSON ───────────────────────────────────────────────────────────
  const cleanedText = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()

  let parsed: FoodAnalysisResult
  try {
    parsed = JSON.parse(cleanedText) as FoodAnalysisResult
  } catch (parseErr) {
    console.error("[vision] JSON parse failed. Cleaned text was:", cleanedText, parseErr)
    return NextResponse.json(
      { success: false, error: "AI response format error — please try again." },
      { status: 422 }
    )
  }

  // ── 6. Validate items ───────────────────────────────────────────────────────
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    return NextResponse.json(
      { success: false, error: "No food detected. Please use a clearer photo." },
      { status: 422 }
    )
  }

  // Recalculate total on the backend in case the model mis-summed
  const total_calories = Math.round(
    parsed.items.reduce((sum, item) => sum + item.calories, 0)
  )

  return NextResponse.json({
    success: true,
    data: { items: parsed.items, total_calories },
  })
}
