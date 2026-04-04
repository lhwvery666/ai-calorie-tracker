import { NextRequest, NextResponse } from "next/server"

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
        ? "今天热量已经达标甚至超标了，建议推荐一道极低热量的清淡小食（200千卡以内）"
        : `还剩余约 ${remainingKcal} 千卡的热量额度，请推荐一顿符合该热量缺口的美味餐食`

    const userPrompt = `
你是一个专业的米其林健康主厨兼营养师，说话亲切有温度。
用户今天${kcalDescription}。
请为他推荐一道做法简单、美味且营养均衡的一顿饭（可以是正餐或加餐）。

请按以下格式输出，注意保持换行结构：
【菜名】写菜名
【预计热量】写大概的千卡数值
【食材清单】逐行列出主要食材和大致用量
【做法步骤】用1、2、3步骤格式，简洁描述核心做法

语气要有亲和力，像朋友推荐一样，不要太正式。
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
                "你是一个专业的健康主厨兼营养师，擅长根据热量需求推荐简单美味的食谱。",
            },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 600,
          temperature: 0.9,
        }),
      }
    )

    if (!zhipuRes.ok) {
      const errText = await zhipuRes.text()
      console.error("[RECIPES_API] Zhipu error:", errText)
      return NextResponse.json(
        { error: "AI 服务暂时不可用，请稍后再试" },
        { status: 502 }
      )
    }

    const zhipuData = (await zhipuRes.json()) as ZhipuChatResponse
    const recipe =
      zhipuData.choices?.[0]?.message?.content?.trim() ??
      "主厨今天休息了，明天再来试试吧～"

    return NextResponse.json({ success: true, recipe })
  } catch (error) {
    console.error("[RECIPES_API_ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
