import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Infer mealType from a given hour (0-23).
// Prefer the client's local hour to avoid UTC timezone mismatch on Vercel.
// 05:00-10:59 -> 早餐 | 11:00-15:59 -> 午餐 | 16:00-21:59 -> 晚餐 | 22:00-04:59 -> 加餐
function getMealType(hour: number): string {
  if (hour >= 5 && hour < 11) return "早餐"
  if (hour >= 11 && hour < 16) return "午餐"
  if (hour >= 16 && hour < 22) return "晚餐"
  return "加餐"
}

export async function POST(req: NextRequest) {
  // 1. Auth guard — reject unauthenticated requests
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const { foodName, calories, protein, carbs, fat, portionSize, confidence, clientHour } =
      (await req.json()) as {
        foodName: string
        calories: number
        protein: number
        carbs: number
        fat: number
        portionSize: string
        confidence: number
        clientHour?: number
      }

    if (!foodName || calories == null) {
      return NextResponse.json({ error: "缺少必要字段" }, { status: 400 })
    }

    // 2. Resolve userId from the session email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 3. Persist the meal record
    const meal = await prisma.meal.create({
      data: {
        userId: user.id,
        foodName,
        calories,
        protein,
        carbs,
        fat,
        portionSize,
        confidence,
        mealType: getMealType(clientHour ?? new Date().getHours()),
      },
    })

    return NextResponse.json({ success: true, data: meal }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误"
    console.error("[meals] 保存失败:", message)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
