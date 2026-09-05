import { err, ok, readJson, requireRole, withAuth } from "@/lib/server-context";
import { getOrganizationSettings } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { MANAGE_ROLES } from "@/lib/server-context";
import { writeAudit } from "@/lib/audit";
import type { OrganizationSettings } from "@/lib/types";
import { z } from "zod";

export const GET = withAuth(async (_req, ctx) => {
  const settings = await getOrganizationSettings(ctx.organizationId);
  if (!settings) return err("Organization not found", 404);
  return ok(settings);
});

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    gstin: z.string().trim().max(30).nullable().optional(),
    industry: z.string().trim().max(50).nullable().optional(),
    city: z.string().trim().max(50).nullable().optional(),
    businessHoursStart: z.number().int().min(0).max(1439).nullable().optional(),
    businessHoursEnd: z.number().int().min(0).max(1439).nullable().optional(),
    workingDays: z.array(z.number().int().min(1).max(7)).nullable().optional(),
    holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    automationsPaused: z.boolean().optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.businessHoursStart == null ||
      d.businessHoursEnd == null ||
      d.businessHoursStart < d.businessHoursEnd,
    { message: "Business hours start must be before end" }
  );

export const PATCH = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (!body) return err("Invalid body", 400);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid settings", 400);
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    if (key === "workingDays") data.workingDays = { days: value };
    else if (key === "holidays") data.holidays = value;
    else data[key] = value;
  }

  const updated = await prisma.organization.update({
    where: { id: ctx.organizationId },
    data,
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SETTINGS_UPDATE",
      entityType: "organization",
      entityId: ctx.organizationId,
      metadata: { changedKeys: Object.keys(data) },
    },
    req
  );

  const workingDays =
    (updated.workingDays as { days: number[] } | null)?.days ?? null;
  const holidays = (updated.holidays as string[] | null) ?? null;
  return ok({
    name: updated.name,
    gstin: updated.gstin,
    industry: updated.industry,
    city: updated.city,
    usersCount: updated.usersCount,
    businessHoursStart: updated.businessHoursStart,
    businessHoursEnd: updated.businessHoursEnd,
    workingDays,
    holidays,
    automationsPaused: updated.automationsPaused,
  } satisfies OrganizationSettings);
});