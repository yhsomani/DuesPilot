import { err, ok, requireRole, withAuth, ACTION_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { writeAudit } from "@/lib/audit";

export const GET = withAuth(async (_req, ctx, params) => {
  const messageId = params?.id;
  if (!messageId) return err("Message ID required", 400);

  const message = await prisma.message.findFirst({
    where: { id: messageId, organizationId: ctx.organizationId },
  });
  if (!message) return err("Message not found", 404);

  return ok({ message });
});

export const POST = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const messageId = params?.id;
  if (!messageId) return err("Message ID required", 400);

  const message = await prisma.message.findFirst({
    where: { id: messageId, organizationId: ctx.organizationId },
  });
  if (!message) return err("Message not found", 404);

  let sendSuccess = true;
  let externalId: string | null = null;
  let errorMessage: string | undefined;

  if (message.channel === "EMAIL") {
    const emailResult = await sendEmail({
      to: message.recipient,
      subject: message.subject || `Important communication from DuesPilot`,
      text: message.body,
    });
    sendSuccess = emailResult.success;
    externalId = emailResult.messageId;
    errorMessage = emailResult.error;
  } else if (message.channel === "WHATSAPP") {
    const waResult = await sendWhatsAppMessage({
      to: message.recipient,
      message: message.body,
    });
    sendSuccess = waResult.success;
    externalId = waResult.messageId;
    errorMessage = waResult.error;
  } else {
    externalId = `sim_${message.channel.toLowerCase()}_${Date.now()}`;
  }

  const updatedStatus = sendSuccess ? "SENT" : "FAILED";

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: {
      status: updatedStatus,
      externalId: externalId || message.externalId,
      sentAt: sendSuccess ? new Date() : message.sentAt,
    },
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "MESSAGE_RETRY",
      entityType: "message",
      entityId: message.id,
      metadata: {
        status: updatedStatus,
        channel: message.channel,
        error: errorMessage || null,
      },
    },
    req
  );

  return ok({
    message: updated,
    error: errorMessage,
  });
});
