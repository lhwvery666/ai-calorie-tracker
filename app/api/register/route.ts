import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = (await req.json()) as {
      email: string
      name: string
      password: string
    }

    if (!email || !name || !password) {
      return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 })
    }

    // Check if email is already registered
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 })
    }

    // Hash password with bcrypt (salt rounds = 12)
    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: { email, name, password: hashedPassword },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误"
    console.error("[register] 注册失败:", message)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
