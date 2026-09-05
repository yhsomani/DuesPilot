import { err, ok, readJson, requireRole, withAuth, ACTION_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { DEFAULT_CADENCE_RULES, WorkflowRule } from "@/lib/workflows";
import { z } from "zod";

const workflowRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  triggerType: z.enum(["DUE_SOON", "OVERDUE", "PROMISE_BROKEN", "HIGH_RISK"]),
  daysRelative: z.number(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  minRiskScore: z.number().optional(),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "TASK"]),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  includePaymentLink: z.boolean().optional(),
  enabled: z.boolean(),
  cooldownHours: z.number().optional(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  rules: z.array(workflowRuleSchema).min(1, "At least one rule is required"),
});

export const GET = withAuth(async (_req, ctx) => {
  const customWorkflows = await prisma.collectionWorkflow.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
  });

  if (customWorkflows.length === 0) {
    // Return standard system default cadence workflow if tenant hasn't defined custom ones yet
    const systemDefault = {
      id: "system_default_cadence",
      name: "Standard B2B Dunning Cadence",
      description: "Default progressive escalation cadence from T-3 days to T+45 days statutory notice",
      enabled: true,
      rules: DEFAULT_CADENCE_RULES,
      isSystemDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return ok({
      workflows: [systemDefault],
      defaultRules: DEFAULT_CADENCE_RULES,
      activeCount: DEFAULT_CADENCE_RULES.filter((r) => r.enabled).length,
      totalRulesCount: DEFAULT_CADENCE_RULES.length,
    });
  }

  const formatted = customWorkflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    enabled: w.enabled,
    rules: w.rules as unknown as WorkflowRule[],
    isSystemDefault: false,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));

  const totalRules = formatted.reduce((acc, w) => acc + (Array.isArray(w.rules) ? w.rules.length : 0), 0);
  const activeRules = formatted.reduce(
    (acc, w) => acc + (Array.isArray(w.rules) ? w.rules.filter((r) => r.enabled).length : 0),
    0
  );

  return ok({
    workflows: formatted,
    defaultRules: DEFAULT_CADENCE_RULES,
    activeCount: activeRules,
    totalRulesCount: totalRules,
  });
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid workflow configuration", 400);
  }

  const { name, description, enabled, rules } = parsed.data;

  const workflow = await prisma.collectionWorkflow.create({
    data: {
      organizationId: ctx.organizationId,
      name,
      description: description || null,
      enabled,
      rules: rules as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "WORKFLOW_CREATE",
      entityType: "workflow",
      entityId: workflow.id,
      metadata: {
        name,
        rulesCount: rules.length,
        enabled,
      },
    },
    req
  );

  return ok(
    {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        enabled: workflow.enabled,
        rules: workflow.rules as unknown as WorkflowRule[],
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      },
    },
    201
  );
});
