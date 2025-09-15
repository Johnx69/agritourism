import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateToken, addMinutes } from "@/lib/tokens"
import { sendMail } from "@/lib/mail"
import { logAction } from "@/lib/activity"

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (user && !user.deletedAt) {
    const token = generateToken()
    await prisma.passwordResetToken.create({
      data: { email, token, expires: addMinutes(new Date(), 30) }
    })
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/reset?token=${token}`
    await sendMail(email, "Reset your password", `<p>Reset link: <a href="${link}">${link}</a></p>`)
    await logAction({ userId: user.id, action: "password_reset_requested" })
  }
  // Always OK (do not leak existence)
  return NextResponse.json({ ok: true })
}
