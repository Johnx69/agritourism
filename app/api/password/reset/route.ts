import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { logAction } from "@/lib/activity"

export async function POST(req: Request) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  const rec = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!rec || rec.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
  }
  const user = await prisma.user.findUnique({ where: { email: rec.email } })
  if (!user || user.deletedAt) return NextResponse.json({ error: "User not found" }, { status: 400 })

  const hash = await bcrypt.hash(password, 10)
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } }),
    prisma.passwordResetToken.delete({ where: { token } })
  ])
  await logAction({ userId: user.id, action: "password_reset" })
  return NextResponse.json({ ok: true })
}
