import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_CADENCE_RULES, WorkflowRule } from "@/lib/workflows";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;
  const workflows = await prisma.collectionWorkflow.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  if (workflows.length === 0) {
    // Return standard system default workflow
    return NextResponse.json({
      workflows: [
        {
          id: "wf_default",
          name: "Standard MSME 45-Day Dunning Cadence",
          description: "Automated multi-channel escalation aligned with MSMED Act 2006",
          enabled: true,
          isSystemDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rules: DEFAULT_CADENCE_RULES,
        },
      ],
    });
  }

  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;
  const body = await req.json();

  // If payload is a single rule to add to default or existing workflow
  if (body.name && (body.triggerType || body.channel)) {
    const newRule: WorkflowRule = {
      id: `rule_${Date.now()}`,
      name: body.name,
      triggerType: body.triggerType || "OVERDUE",
      daysRelative: Number(body.daysRelative ?? 7),
      channel: body.channel || "WHATSAPP",
      minAmount: body.minAmount ? Number(body.minAmount) : undefined,
      maxAmount: body.maxAmount ? Number(body.maxAmount) : undefined,
      minRiskScore: body.minRiskScore ? Number(body.minRiskScore) : undefined,
      templateId: body.templateId || undefined,
      templateName: body.templateName || undefined,
      includePaymentLink: body.includePaymentLink ?? true,
      enabled: body.enabled ?? true,
      cooldownHours: Number(body.cooldownHours ?? 24),
    };

    // Find existing workflow or create one
    let workflow = await prisma.collectionWorkflow.findFirst({
      where: { organizationId },
    });

    if (!workflow) {
      workflow = await prisma.collectionWorkflow.create({
        data: {
          organizationId,
          name: "Custom Dunning Cadence",
          description: "Tenant customized multi-channel dunning workflow",
          enabled: true,
          rules: [...DEFAULT_CADENCE_RULES, newRule] as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      const existingRules = Array.isArray(workflow.rules) ? (workflow.rules as unknown as WorkflowRule[]) : [];
      workflow = await prisma.collectionWorkflow.update({
        where: { id: workflow.id },
        data: {
          rules: [...existingRules, newRule] as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await writeAudit({
      organizationId,
      userId: session.user.id || null,
      action: "WORKFLOW_RULE_CREATED",
      entityType: "collection_workflow",
      entityId: workflow.id,
      metadata: { ruleName: newRule.name, channel: newRule.channel },
    });

    return NextResponse.json(
      {
        workflow: {
          ...workflow,
          ...body,
          id: workflow.id,
        },
      },
      { status: 201 }
    );
  }

  // Full workflow creation
  const createdWorkflow = await prisma.collectionWorkflow.create({
    data: {
      organizationId,
      name: body.name || "Custom Dunning Cadence",
      description: body.description || "",
      enabled: body.enabled ?? true,
      rules: body.rules || DEFAULT_CADENCE_RULES,
    },
  });

  await writeAudit({
    organizationId,
    userId: session.user.id || null,
    action: "WORKFLOW_CREATED",
    entityType: "collection_workflow",
    entityId: createdWorkflow.id,
    metadata: { name: createdWorkflow.name },
  });

  return NextResponse.json({ workflow: createdWorkflow }, { status: 201 });
}
