import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

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
const PROMPT = `You are a professional nutritionist. Analyze every food item visible in the image.
Return ONLY valid JSON — no markdown, no explanation, no extra text:
{"items":[{"name":"ingredient name","weight_g":number,"calories_per_100g":number,"calories":number}],"total_calories":number}
If no food is detected, return: {"items":[],"total_calories":0}`

export async function POST(req: NextRequest) {
  // ── 1. Parse request ────────────────────────────────────────────────────────
  let image: string
  try {
    const body = (await req.json()) as { image?: string }
    if (!body.image) {
      return NextResponse.json(
        { success: false, error: "Missing 'image' field in request body." },
        { status: 400 }
      )
    }
    image = body.image
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    )
  }

  // ── 2. Validate API key ─────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[vision] OPENAI_API_KEY is not set in environment variables.")
    return NextResponse.json(
      { success: false, error: "Server misconfiguration: API key missing." },
      { status: 500 }
    )
  }

  // ── 3. Ensure data URL prefix ───────────────────────────────────────────────
  // Frontend may send a raw base64 string without the data: prefix
  const imageUrl = image.startsWith("data:")
    ? image
    : `data:image/jpeg;base64,${image}`

  // ── 4. Call Qwen-VL via OpenAI-compatible SDK ───────────────────────────────
  let rawText: string
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    })

    const response = await client.chat.completions.create({
      model: "qwen-vl-max",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    })

    rawText = response.choices[0]?.message?.content?.trim() ?? ""
    console.log("[vision] Qwen-VL raw response:", rawText.slice(0, 300))

    if (!rawText) {
      return NextResponse.json(
        { success: false, error: "AI returned an empty response. Please try again." },
        { status: 502 }
      )
    }
  } catch (apiErr) {
    const name    = apiErr instanceof Error ? apiErr.name    : "UnknownError"
    const message = apiErr instanceof Error ? apiErr.message : String(apiErr)
    const status  = (apiErr as Record<string, unknown>).status ?? "n/a"
    console.error("[vision] Qwen-VL API call failed:")
    console.error("  name   :", name)
    console.error("  message:", message)
    console.error("  status :", status)

    if (status === 429) {
      return NextResponse.json(
        { success: false, error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: `AI service error (${status}): ${message}`,
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
    console.error("[vision] JSON parse failed. Cleaned text:", cleanedText, parseErr)
    return NextResponse.json(
      { success: false, error: "AI response format error — please try again." },
      { status: 422 }
    )
  }

  // ── 6. Validate result ──────────────────────────────────────────────────────
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
