import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email(),
});

const RESET_TTL_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (user) {
    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashedToken,
        expires: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    // Email sending is blocked until the provider integration (TODO-042) ships.
    // Token is surfaced via logs, and via the API response in non-production.
    console.log(`[password-reset] ${email}: ${baseUrl}/reset-password?token=${token}`);

    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    return NextResponse.json({
      sent: true,
      devResetUrl: process.env.NODE_ENV !== "production" ? resetLink : undefined,
    });
  }

  // Identity-blind response: do not reveal whether the account exists.
  return NextResponse.json({ sent: true });
}