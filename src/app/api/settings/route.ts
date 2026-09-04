import { err, ok, readJson, requireRole, withAuth } from "@/lib/server-context";
import { getOrganizationSettings } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { MANAGE_ROLES } from "@/lib/server-context";
import type { OrganizationSettings } from "@/lib/types";

export const GET = withAuth(async (_req, ctx) => {
  const settings = await getOrganizationSettings(ctx.organizationId);
  if (!settings) return err("Organization not found", 404);
  return ok(settings);
});

export const PATCH = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const body = (await readJson(req)) as Partial<
    Pick<OrganizationSettings, "name" | "gstin" | "industry" | "city">
  > | null;
  if (!body) return err("Invalid body", 400);

  const data: {
    name?: string;
    gstin?: string | null;
    industry?: string | null;
    city?: string | null;
  } = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    data.name = body.name.trim();
  }
  if (typeof body.gstin === "string") data.gstin = body.gstin.trim() || null;
  if (typeof body.industry === "string") data.industry = body.industry.trim() || null;
  if (typeof body.city === "string") data.city = body.city.trim() || null;

  const updated = await prisma.organization.update({
    where: { id: ctx.organizationId },
    data,
  });
  return ok({
    name: updated.name,
    gstin: updated.gstin,
    industry: updated.industry,
    city: updated.city,
    usersCount: updated.usersCount,
  } satisfies OrganizationSettings);
});
