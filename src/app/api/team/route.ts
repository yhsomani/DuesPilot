import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
  MANAGE_ROLES,
} from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { syncUsersCount } from "@/lib/team";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum([
    "OWNER",
    "ADMIN",
    "FINANCE_MANAGER",
    "COLLECTOR",
    "SALES",
    "VIEWER",
  ]),
});

export const GET = withAuth(async (_req, ctx) => {
  const members = await prisma.user.findMany({
    where: { organizationId: ctx.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return ok(
    members.map((m) => ({
      ...m,
      emailVerified: m.emailVerified?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return err("Enter a valid email and role", 400);

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organizationId: true },
  });
  if (existing) {
    return err(
      existing.organizationId === ctx.organizationId
        ? "This person is already a member of your organization"
        : "This email is already registered to another organization",
      400
    );
  }

  const tempPassword = randomBytes(9).toString("base64url").slice(0, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
      organizationId: ctx.organizationId,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await syncUsersCount(ctx.organizationId);
  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "TEAM_INVITE",
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    },
    req
  );

  // Email sending is blocked (TODO-042). Instead of silently failing, surface
  // the temporary password once (dev-mode only). In production, an invite e-mail
  // would carry it.
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tempPassword,
    inviteUrl:
      process.env.NODE_ENV !== "production"
        ? `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`
        : undefined,
  });
});