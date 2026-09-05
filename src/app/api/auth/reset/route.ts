import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const hashedToken = createHash("sha256")
    .update(parsed.data.token)
    .digest("hex");

  const record = await prisma.verificationToken.findFirst({
    where: { token: hashedToken },
  });

  if (!record || record.expires.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    }),
  ]);

  return NextResponse.json({ reset: true });
}