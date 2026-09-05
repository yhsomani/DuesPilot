import { err, ok, readJson, requireRole, withAuth, ACTION_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { WorkflowRule } from "@/lib/workflows";
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

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  rules: z.array(workflowRuleSchema).optional(),
});

export const GET = withAuth(async (_req, ctx, params) => {
  const workflowId = params?.id;
  if (!workflowId) return err("Missing workflow ID", 400);

  const workflow = await prisma.collectionWorkflow.findFirst({
    where: { id: workflowId, organizationId: ctx.organizationId },
  });

  if (!workflow) {
    return err("Workflow not found", 404);
  }

  return ok({
    workflow: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      enabled: workflow.enabled,
      rules: workflow.rules as unknown as WorkflowRule[],
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    },
  });
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const workflowId = params?.id;
  if (!workflowId) return err("Missing workflow ID", 400);

  const body = await readJson(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = updateWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid update payload", 400);
  }

  const existing = await prisma.collectionWorkflow.findFirst({
    where: { id: workflowId, organizationId: ctx.organizationId },
  });

  if (!existing) {
    return err("Workflow not found", 404);
  }

  const { name, description, enabled, rules } = parsed.data;

  const updated = await prisma.collectionWorkflow.update({
    where: { id: workflowId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(enabled !== undefined && { enabled }),
      ...(rules !== undefined && { rules: rules as any }), // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "WORKFLOW_UPDATE",
      entityType: "workflow",
      entityId: workflowId,
      metadata: {
        updatedFields: Object.keys(parsed.data),
        enabled: updated.enabled,
      },
    },
    req
  );

  return ok({
    workflow: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      enabled: updated.enabled,
      rules: updated.rules as unknown as WorkflowRule[],
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

export const DELETE = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const workflowId = params?.id;
  if (!workflowId) return err("Missing workflow ID", 400);

  const existing = await prisma.collectionWorkflow.findFirst({
    where: { id: workflowId, organizationId: ctx.organizationId },
  });

  if (!existing) {
    return err("Workflow not found", 404);
  }

  await prisma.collectionWorkflow.delete({
    where: { id: workflowId },
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "WORKFLOW_DELETE",
      entityType: "workflow",
      entityId: workflowId,
      metadata: {
        name: existing.name,
      },
    },
    req
  );

  return ok({ success: true, message: "Workflow deleted successfully" });
});
