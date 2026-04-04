import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ── Activity multipliers (Mifflin-St Jeor standard) ──────────────────────────
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,    // desk job, no exercise
  light:     1.375,  // 1-3 workouts/week
  moderate:  1.55,   // 3-5 workouts/week
  active:    1.725,  // hard exercise every day
}

// ── Calorie adjustment by goal ────────────────────────────────────────────────
const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose:     -500,  // caloric deficit for fat loss
  maintain:    0,  // maintenance
  gain:      300,  // lean bulk surplus
}

// GET — return the current user's body-data settings
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: {
        gender:        true,
        age:           true,
        height:        true,
        weight:        true,
        activityLevel: true,
        goal:          true,
        targetKcal:    true,
      },
    })

    return NextResponse.json({ data: user })
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误"
    console.error("[settings GET] 失败:", message)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

// POST — save body data and re-calculate TDEE → targetKcal
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const { gender, age, height, weight, activityLevel, goal } = (await req.json()) as {
      gender:        string
      age:           number
      height:        number
      weight:        number
      activityLevel: string
      goal:          string
    }

    if (!gender || !age || !height || !weight || !activityLevel || !goal) {
      return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 })
    }

    // ── Step 1: BMR via Mifflin-St Jeor formula ───────────────────────────────
    const bmr =
      gender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161

    // ── Step 2: TDEE = BMR × activity multiplier ─────────────────────────────
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2
    const tdee = bmr * multiplier

    // ── Step 3: Adjust for goal → final daily calorie target ──────────────────
    const adjustment = GOAL_ADJUSTMENTS[goal] ?? 0
    const targetKcal = Math.round(tdee + adjustment)

    // ── Step 4: Persist all fields ────────────────────────────────────────────
    const updated = await prisma.user.update({
      where: { email: session.user.email },
      data:  { gender, age, height, weight, activityLevel, goal, targetKcal },
      select: { targetKcal: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误"
    console.error("[settings POST] 失败:", message)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
