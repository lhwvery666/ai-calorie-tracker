import { NextRequest, NextResponse } from "next/server"

// Shape of the parsed AI analysis result
interface FoodAnalysis {
  foodName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  portionSize: string
  confidence: number
}

// Shape of the GLM-4V API response (OpenAI-compatible)
interface ZhipuChatResponse {
  choices: {
    message: {
      content: string
    }
  }[]
}

const SYSTEM_PROMPT =
  "你是一个资深的营养学专家和图像识别专家。请精准分析这张图片中的食物。你必须只返回一段纯 JSON 格式的数据，不要包含任何 markdown 标记（如 ```json），不要任何多余的解释文字！ JSON 必须包含以下字段：foodName(菜名，字符串), calories(估算总卡路里，整数), protein(蛋白质克数，浮点数), carbs(碳水克数，浮点数), fat(脂肪克数，浮点数), portionSize(份量描述，字符串，如\"一盘约300g\"), confidence(你的识别准确率置信度，0到1之间的小数)。"

export async function POST(req: NextRequest) {
  try {
    const { image } = (await req.json()) as { image: string }

    if (!image) {
      return NextResponse.json({ error: "缺少 image 字段" }, { status: 400 })
    }

    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "服务端 API Key 未配置" }, { status: 500 })
    }

    // Call GLM-4V via the OpenAI-compatible endpoint
    const zhipuRes = await fetch(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "glm-4v",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    // Accept both raw base64 and pre-formatted data URIs
                    url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
                  },
                },
                {
                  type: "text",
                  text: "请分析这张图片中的食物并返回 JSON。",
                },
              ],
            },
          ],
        }),
      }
    )

    if (!zhipuRes.ok) {
      const errorText = await zhipuRes.text()
      console.error("[vision] 智谱 API 错误:", errorText)
      return NextResponse.json(
        { error: "AI 服务请求失败", detail: errorText },
        { status: 502 }
      )
    }

    const zhipuData = (await zhipuRes.json()) as ZhipuChatResponse
    const rawContent = zhipuData.choices?.[0]?.message?.content ?? ""

    // Strip markdown code fences the model may wrap around the JSON
    // e.g. ```json\n{...}\n``` or ```\n{...}\n```
    const cleanedContent = rawContent
      .replace(/^```(?:json)?\s*/i, "")  // opening fence + optional "json" tag
      .replace(/\s*```\s*$/i, "")        // closing fence
      .trim()

    // Parse the sanitised JSON string returned by the model
    const analysis = JSON.parse(cleanedContent) as FoodAnalysis

    return NextResponse.json({ success: true, data: analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误"
    console.error("[vision] 处理失败:", message)
    return NextResponse.json({ error: "服务器内部错误", detail: message }, { status: 500 })
  }
}
