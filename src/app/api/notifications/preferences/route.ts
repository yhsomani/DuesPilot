import { err, ok, readJson, withAuth } from "@/lib/server-context";
import { z } from "zod";

const DEFAULTS = {
  showBrokenPromiseBanner: true,
  showQueueWhy: true,
  emailDailyDigest: false,
};

const patchSchema = z
  .object({
    showBrokenPromiseBanner: z.boolean().optional(),
    showQueueWhy: z.boolean().optional(),
    emailDailyDigest: z.boolean().optional(),
  })
  .strict();

const isMissingTable = (e: unknown) =>
  e instanceof Error && e.message.includes("does not exist in the current database");

export const GET = withAuth(async (_req, ctx) => {
  try {
    const prefs = await setupPrismaUserPreferencesRead(ctx.userId);
    return ok(prefs);
  } catch (e) {
    if (isMissingTable(e)) {
      return ok({ ...DEFAULTS, available: false });
    }
    throw e;
  }
});

export const PATCH = withAuth(async (req, ctx) => {
  const body = await readJson(req);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err("Invalid preferences", 400);

  try {
    const prefs = await syncUserPreferences(ctx.userId, parsed.data);
    return ok(prefs);
  } catch (e) {
    if (isMissingTable(e)) {
      return err(
        "Notification preferences require the pending schema migration to be applied.",
        503
      );
    }
    throw e;
  }
});

async function setupPrismaUserPreferencesRead(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (prefs) {
    return {
      showBrokenPromiseBanner: prefs.showBrokenPromiseBanner,
      showQueueWhy: prefs.showQueueWhy,
      emailDailyDigest: prefs.emailDailyDigest,
      available: true,
    };
  }
  return { ...DEFAULTS, available: true };
}

async function syncUserPreferences(
  userId: string,
  data: z.infer<typeof patchSchema>
) {
  const { prisma } = await import("@/lib/prisma");
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...DEFAULTS,
      ...data,
    },
    update: data,
  });
  return {
    showBrokenPromiseBanner: prefs.showBrokenPromiseBanner,
    showQueueWhy: prefs.showQueueWhy,
    emailDailyDigest: prefs.emailDailyDigest,
    available: true,
  };
}