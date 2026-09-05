import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { createPaymentLink } from "@/lib/payment-links";
import {
  DEFAULT_CADENCE_RULES,
  evaluateAllCadenceRules,
  WorkflowRule,
  CadenceContextInvoice,
} from "@/lib/workflows";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

interface WorkflowRunnerOptions {
  organizationId?: string;
  dryRun?: boolean;
  referenceDate?: string;
}

export async function executeCadenceRunner(
  organizationId: string,
  options: { dryRun?: boolean; referenceDate?: Date; userId?: string | null } = {}
) {
  const refDate = options.referenceDate ?? new Date();
  const isDryRun = !!options.dryRun;

  // 1. Fetch Organization Details
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) {
    return { error: "Organization not found", evaluatedCount: 0, matchedCount: 0, sentCount: 0 };
  }

  // 2. Fetch Active Workflow Rules for Tenant
  const customWorkflows = await prisma.collectionWorkflow.findMany({
    where: { organizationId, enabled: true },
  });

  let activeRules: WorkflowRule[] = [];
  if (customWorkflows.length > 0) {
    for (const cw of customWorkflows) {
      if (Array.isArray(cw.rules)) {
        activeRules.push(...(cw.rules as unknown as WorkflowRule[]).filter((r) => r.enabled));
      }
    }
  }

  if (activeRules.length === 0) {
    // Fall back to system default rules
    activeRules = DEFAULT_CADENCE_RULES.filter((r) => r.enabled);
  }

  // 3. Fetch Candidate Invoices & Customer Context
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      outstandingAmount: { gt: 0 },
      status: {
        in: ["OVERDUE", "OPEN", "DUE_SOON", "PARTIALLY_PAID", "PROMISE_BROKEN"],
      },
    },
    include: {
      customer: {
        include: {
          contacts: true,
          promisesToPay: {
            where: { status: "ACTIVE" },
          },
          collectionEvents: {
            where: {
              type: {
                in: ["email_sent", "whatsapp_outreach", "cadence_email_dispatched", "cadence_whatsapp_dispatched"],
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      dispute: {
        where: { status: "open" },
      },
    },
  });

  // 4. Map to Cadence Evaluation Context
  const cadenceCandidates: CadenceContextInvoice[] = invoices.map((inv) => {
    const primaryContact = inv.customer.contacts.find((c) => c.isPrimary) || inv.customer.contacts[0];
    const customerEmail = primaryContact?.email || inv.customer.email || null;
    const customerPhone = primaryContact?.phone || inv.customer.phone || null;
    const lastContactEvent = inv.customer.collectionEvents[0];

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      outstandingAmount: inv.outstandingAmount,
      dueDate: inv.dueDate,
      status: inv.status,
      customerId: inv.customerId,
      customerName: inv.customer.name,
      customerEmail,
      customerPhone,
      customerRiskScore: inv.customer.riskScore,
      hasActiveDispute: !!inv.dispute,
      hasActivePromise: inv.customer.promisesToPay.length > 0,
      lastContactedAt: lastContactEvent ? lastContactEvent.createdAt : null,
    };
  });

  // 5. Evaluate Rules Engine
  const matchedEntries = evaluateAllCadenceRules(cadenceCandidates, activeRules, refDate);

  if (isDryRun) {
    return {
      dryRun: true,
      evaluatedCount: cadenceCandidates.length,
      matchedCount: matchedEntries.length,
      sentCount: 0,
      matches: matchedEntries.map(({ invoice, rule }) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        outstandingAmount: invoice.outstandingAmount,
        dueDate: invoice.dueDate,
        ruleId: rule.id,
        ruleName: rule.name,
        channel: rule.channel,
        daysRelative: rule.daysRelative,
        recipient: rule.channel === "WHATSAPP" ? invoice.customerPhone : invoice.customerEmail,
      })),
    };
  }

  // 6. Live Execution Loop
  let sentCount = 0;
  let failedCount = 0;
  const executionResults: Array<{
    invoiceId: string;
    invoiceNumber: string;
    ruleId: string;
    channel: string;
    recipient: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const { invoice, rule } of matchedEntries) {
    const recipient = rule.channel === "WHATSAPP" ? invoice.customerPhone : invoice.customerEmail;
    if (!recipient) {
      failedCount++;
      continue;
    }

    // Dynamic Payment Link generation if requested
    let paymentLinkUrl = `https://pay.duespilot.com/invoices/${invoice.id}`;
    let upiQrPayload = "";
    if (rule.includePaymentLink) {
      const plink = await createPaymentLink({
        amount: invoice.outstandingAmount,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail || undefined,
        customerPhone: invoice.customerPhone || undefined,
        merchantName: org.name,
      });
      paymentLinkUrl = plink.paymentUrl;
      upiQrPayload = plink.upiDeepLink;
    }

    const dueFormatted = new Date(invoice.dueDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const vars: Record<string, string | number> = {
      customerName: invoice.customerName,
      contactName: invoice.customerName.split(" ")[0] || "Valued Customer",
      invoiceNumber: invoice.invoiceNumber,
      amount: `₹${invoice.amount.toLocaleString("en-IN")}`,
      outstandingAmount: `₹${invoice.outstandingAmount.toLocaleString("en-IN")}`,
      dueDate: dueFormatted,
      daysOverdue: Math.max(0, Math.round((refDate.getTime() - new Date(invoice.dueDate).getTime()) / (86400 * 1000))),
      companyName: org.name,
      paymentLink: paymentLinkUrl,
      upiQrString: upiQrPayload,
    };

    let bodyText = `Dear ${invoice.customerName}, this is an automated update from ${org.name} regarding invoice ${invoice.invoiceNumber} for ₹${invoice.outstandingAmount.toLocaleString("en-IN")}. Settlement link: ${paymentLinkUrl}`;
    const subject = `${rule.name} - ${invoice.invoiceNumber} (${org.name})`;

    if (rule.channel === "WHATSAPP") {
      bodyText = `Hi ${vars.contactName}, automated reminder from *${org.name}*: Invoice *${invoice.invoiceNumber}* (₹${invoice.outstandingAmount.toLocaleString("en-IN")}) is due/overdue. Pay online: ${paymentLinkUrl}`;
    }

    let success = true;
    let externalId: string | null = null;
    let errMessage: string | undefined;

    if (rule.channel === "EMAIL") {
      const res = await sendEmail({
        to: recipient,
        subject,
        text: bodyText,
      });
      success = res.success;
      externalId = res.messageId;
      errMessage = res.error;
    } else if (rule.channel === "WHATSAPP") {
      const res = await sendWhatsAppMessage({
        to: recipient,
        message: bodyText,
      });
      success = res.success;
      externalId = res.messageId;
      errMessage = res.error;
    }

    const status = success ? "SENT" : "FAILED";

    // Create Message record
    const msg = await prisma.message.create({
      data: {
        organizationId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        channel: rule.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
        direction: "outbound",
        subject,
        body: bodyText,
        recipient,
        status,
        externalId,
        sentAt: success ? new Date() : null,
      },
    });

    // Create CollectionEvent timeline item
    await prisma.collectionEvent.create({
      data: {
        organizationId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        type: rule.channel === "WHATSAPP" ? "cadence_whatsapp_dispatched" : "cadence_email_dispatched",
        description: `Automated Cadence [${rule.name}]: Dispatched ${rule.channel} to ${recipient}`,
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          messageId: msg.id,
          paymentLink: paymentLinkUrl,
          status,
          error: errMessage || null,
        },
        createdById: options.userId || null,
      },
    });

    if (success) {
      sentCount++;
    } else {
      failedCount++;
    }

    executionResults.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      ruleId: rule.id,
      channel: rule.channel,
      recipient,
      success,
      error: errMessage,
    });
  }

  // Record Audit Log
  await writeAudit({
    organizationId,
    userId: options.userId || null,
    action: "CADENCE_BATCH_RUN",
    entityType: "workflow_runner",
    entityId: `run_${Date.now()}`,
    metadata: {
      evaluatedCount: cadenceCandidates.length,
      matchedCount: matchedEntries.length,
      sentCount,
      failedCount,
      activeRulesCount: activeRules.length,
    },
  });

  return {
    dryRun: false,
    evaluatedCount: cadenceCandidates.length,
    matchedCount: matchedEntries.length,
    sentCount,
    failedCount,
    results: executionResults,
  };
}

async function handleRunner(req: Request) {
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader && safeEqual(authHeader, `Bearer ${cronSecret}`);

  let orgId = url.searchParams.get("organizationId");
  const dryRunParam = url.searchParams.get("dry_run");
  let isDryRun = dryRunParam === "1" || dryRunParam === "true";
  let userId: string | null = null;

  if (req.method === "POST") {
    try {
      const body = (await req.json()) as WorkflowRunnerOptions;
      if (body.organizationId) orgId = body.organizationId;
      if (body.dryRun !== undefined) isDryRun = body.dryRun;
    } catch {
      // Body is optional
    }
  }

  if (!isCron) {
    // Authenticate via regular user session
    const session = await auth();
    if (!session || !session.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    orgId = session.user.organizationId;
    userId = session.user.id || null;
  }

  if (orgId) {
    const result = await executeCadenceRunner(orgId, { dryRun: isDryRun, userId });
    return NextResponse.json({ ok: true, organizationId: orgId, ...result });
  }

  // Cross-tenant execution for cron worker
  const allOrgs = await prisma.organization.findMany({ select: { id: true } });
  let totalEvaluated = 0;
  let totalMatched = 0;
  let totalSent = 0;

  for (const o of allOrgs) {
    const r = await executeCadenceRunner(o.id, { dryRun: isDryRun, userId: null });
    totalEvaluated += r.evaluatedCount;
    totalMatched += r.matchedCount;
    totalSent += r.sentCount;
  }

  return NextResponse.json({
    ok: true,
    organizationsCount: allOrgs.length,
    evaluatedCount: totalEvaluated,
    matchedCount: totalMatched,
    sentCount: totalSent,
    dryRun: isDryRun,
  });
}

export async function GET(req: Request) {
  return handleRunner(req);
}

export async function POST(req: Request) {
  return handleRunner(req);
}
