import { err, ok, readJson, requireRole, withAuth, ACTION_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

const sendMessageSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  invoiceId: z.string().optional().nullable(),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "CALL", "MANUAL"]).default("EMAIL"),
  recipient: z.string().min(1, "Recipient address or number is required"),
  subject: z.string().optional().nullable(),
  body: z.string().min(1, "Message content cannot be empty"),
  templateId: z.string().optional().nullable(),
});

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const customerId = searchParams.get("customerId");
  const invoiceId = searchParams.get("invoiceId");
  const search = searchParams.get("search");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  const where: Prisma.MessageWhereInput = {
    organizationId: ctx.organizationId,
  };

  if (channel && ["EMAIL", "WHATSAPP", "SMS", "CALL", "MANUAL"].includes(channel.toUpperCase())) {
    where.channel = channel.toUpperCase() as Prisma.EnumCommunicationChannelFilter["equals"];
  }

  if (status && ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"].includes(status.toUpperCase())) {
    where.status = status.toUpperCase() as Prisma.EnumMessageStatusFilter["equals"];
  }

  if (customerId) where.customerId = customerId;
  if (invoiceId) where.invoiceId = invoiceId;

  if (search) {
    where.OR = [
      { recipient: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.message.count({ where }),
  ]);

  // Enrich with customer details if available
  const customerIds = Array.from(new Set(messages.map((m) => m.customerId).filter(Boolean))) as string[];
  const customers = customerIds.length > 0
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds }, organizationId: ctx.organizationId },
        select: { id: true, name: true },
      })
    : [];
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const enrichedMessages = messages.map((m) => ({
    id: m.id,
    customerId: m.customerId,
    customerName: m.customerId ? customerMap.get(m.customerId) || null : null,
    invoiceId: m.invoiceId,
    channel: m.channel,
    direction: m.direction,
    subject: m.subject,
    body: m.body,
    recipient: m.recipient,
    status: m.status,
    externalId: m.externalId,
    sentAt: m.sentAt?.toISOString() || null,
    createdAt: m.createdAt.toISOString(),
  }));

  return ok({
    messages: enrichedMessages,
    total,
    limit,
    offset,
  });
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid message data", 400);
  }

  const { customerId, invoiceId, channel, recipient, subject, body: messageBody, templateId } = parsed.data;

  // Verify customer belongs to this organization
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: ctx.organizationId },
  });
  if (!customer) {
    return err("Customer not found in this organization", 404);
  }

  let invoiceNumber: string | null = null;
  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: ctx.organizationId, customerId },
    });
    if (invoice) {
      invoiceNumber = invoice.invoiceNumber;
    }
  }

  let sendSuccess = true;
  let externalId: string | null = null;
  let errorMessage: string | undefined;

  if (channel === "EMAIL") {
    const emailResult = await sendEmail({
      to: recipient,
      subject: subject || `Important communication from DuesPilot`,
      text: messageBody,
    });
    sendSuccess = emailResult.success;
    externalId = emailResult.messageId;
    errorMessage = emailResult.error;
  } else {
    // For WHATSAPP / SMS / CALL / MANUAL
    externalId = `sim_${channel.toLowerCase()}_${Date.now()}`;
  }

  const messageStatus = sendSuccess ? "SENT" : "FAILED";

  const message = await prisma.message.create({
    data: {
      organizationId: ctx.organizationId,
      customerId,
      invoiceId: invoiceId || null,
      channel,
      direction: "outbound",
      subject: subject || null,
      body: messageBody,
      recipient,
      status: messageStatus,
      externalId,
      sentAt: sendSuccess ? new Date() : null,
    },
  });

  // Record CollectionEvent on the customer timeline
  await prisma.collectionEvent.create({
    data: {
      organizationId: ctx.organizationId,
      customerId,
      invoiceId: invoiceId || null,
      type: channel === "EMAIL" ? "email_sent" : `${channel.toLowerCase()}_outreach`,
      description: `Sent ${channel} to ${recipient}: ${subject || "Outreach message"}`,
      metadata: {
        messageId: message.id,
        channel,
        templateId: templateId || null,
        invoiceNumber,
        status: messageStatus,
        error: errorMessage || null,
      },
      createdById: ctx.userId,
    },
  });

  // Write audit trail
  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "MESSAGE_SEND",
      entityType: "message",
      entityId: message.id,
      metadata: {
        channel,
        recipient,
        customerId,
        invoiceId,
        status: messageStatus,
      },
    },
    req
  );

  return ok({
    message: {
      id: message.id,
      customerId: message.customerId,
      customerName: customer.name,
      invoiceId: message.invoiceId,
      channel: message.channel,
      direction: message.direction,
      subject: message.subject,
      body: message.body,
      recipient: message.recipient,
      status: message.status,
      externalId: message.externalId,
      sentAt: message.sentAt?.toISOString() || null,
      createdAt: message.createdAt.toISOString(),
    },
    error: errorMessage,
  });
});
