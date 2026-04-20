import { NextRequest, NextResponse } from "next/server"

export interface RecipeData {
  title: string
  estimatedKcal: number
  price: "budget" | "moderate" | "premium"
  difficulty: "easy" | "medium" | "hard"
  description: string
  ingredients: string[]
  steps: string[]
}

interface RecipePayload {
  remainingKcal: number
}

interface ZhipuChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export async function POST(req: NextRequest) {
  try {
    const { remainingKcal }: RecipePayload = await req.json()

    const kcalDescription =
      remainingKcal <= 0
        ? "今天热量已经达标甚至超标了，请推荐一道极低热量的清淡小食（200千卡以内）"
        : `还剩余约 ${remainingKcal} 千卡的热量额度，请推荐一顿符合该热量缺口的美味餐食`

    const userPrompt = `
你是一个专业的米其林健康主厨兼营养师。
用户今天${kcalDescription}。

请为他推荐一道做法简单、美味且营养均衡的一顿饭。

你必须严格以 JSON 格式输出，不能包含任何 Markdown 标记或额外文字，只返回纯 JSON 对象：
{
  "title": "菜名",
  "estimatedKcal": 热量纯数字,
  "price": "budget" 或 "moderate" 或 "premium" 三选一（budget=食材成本<15元，moderate=15-30元，premium=>30元）,
  "difficulty": "easy" 或 "medium" 或 "hard" 三选一（easy=15分钟内新手可做，medium=30分钟有点技巧，hard=45分钟以上需要经验）,
  "description": "用一句轻松亲切的话介绍这道菜，像朋友推荐一样",
  "ingredients": ["食材1 用量", "食材2 用量"],
  "steps": ["步骤1", "步骤2", "步骤3"]
}
`.trim()

    const zhipuRes = await fetch(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的健康主厨兼营养师，你的回复必须且只能是合法的 JSON 对象，不包含任何 Markdown 代码块或其他文字。",
            },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 800,
          temperature: 0.9,
        }),
      }
    )

    if (!zhipuRes.ok) {
      const errText = await zhipuRes.text()
      console.error("[RECIPES_API] Zhipu error:", errText)
      return NextResponse.json(
        { success: false, error: "AI service is temporarily unavailable. Please try again." },
        { status: 502 }
      )
    }

    const zhipuData = (await zhipuRes.json()) as ZhipuChatResponse
    const raw = zhipuData.choices?.[0]?.message?.content?.trim() ?? ""

    // Strip Markdown fences if model wraps output anyway
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    let recipeData: RecipeData
    try {
      recipeData = JSON.parse(cleaned) as RecipeData
    } catch {
      console.error("[RECIPES_API] JSON parse failed:", cleaned)
      return NextResponse.json(
        { success: false, error: "Recipe format error — please try again." },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, recipe: recipeData })
  } catch (error) {
    console.error("[RECIPES_API_ERROR]", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
