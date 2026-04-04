import { NextRequest } from "next/server"

interface MealItem {
  foodName: string
  calories: number
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface SuggestionPayload {
  targetKcal: number
  consumedKcal: number
  meals: MealItem[]
  /** Conversation history — empty array means first-time greeting */
  messages?: ChatMessage[]
}

export async function POST(req: NextRequest) {
  try {
    const { targetKcal, consumedKcal, meals, messages = [] }: SuggestionPayload =
      await req.json()

    const mealList =
      meals.length > 0
        ? meals.map((m) => `${m.foodName}(${m.calories}kcal)`).join("、")
        : "暂无记录"

    const remaining = targetKcal - consumedKcal

    // System prompt always carries user context so the model stays grounded
    const systemPrompt = `你是一个贴心、幽默的 AI 营养师助手，说话接地气，不废话。
已知用户今天的饮食数据：
- 目标热量：${targetKcal} kcal
- 已摄入：${consumedKcal} kcal
- 剩余配额：${remaining} kcal
- 今天吃了：${mealList}
请始终基于以上数据回答，回答要简洁有温度。`

    // If no history → initial greeting (short); otherwise → follow-up (longer)
    const isFirstGreeting = messages.length === 0
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(isFirstGreeting
        ? [
            {
              role: "user",
              content:
                "你好！请用一两句话（50字以内）给我的今日饮食现状一个接地气的评价和建议。",
            },
          ]
        : messages),
    ]

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
          messages: chatMessages,
          max_tokens: isFirstGreeting ? 120 : 400,
          temperature: 0.8,
          stream: true, // 💡 Enable SSE streaming
        }),
      }
    )

    if (!zhipuRes.ok || !zhipuRes.body) {
      const errText = await zhipuRes.text().catch(() => "unknown")
      console.error("[SUGGESTION_API] Zhipu error:", errText)
      // Return a plain-text fallback so the frontend can still display something
      return new Response("今天吃得不错，继续保持均衡饮食！", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    // Pipe the Zhipu SSE stream directly to the client — zero buffering
    return new Response(zhipuRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Prevent Nginx / Vercel from buffering the stream
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("[SUGGESTION_API_ERROR]", error)
    return new Response("AI 营养师暂时不可用，稍后再试～", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
