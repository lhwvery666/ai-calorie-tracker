import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify ownership before deleting — never delete another user's meal
    const meal = await prisma.meal.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user || meal.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.meal.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[meals/delete] Failed:", message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
