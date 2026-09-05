import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Normalizes provider-specific webhook events to DuesPilot MessageStatus.
 */
function normalizeStatus(rawStatus: string): "DELIVERED" | "READ" | "FAILED" | "SENT" | null {
  const s = rawStatus.toLowerCase().trim();
  if (s === "delivered" || s === "delivery" || s === "success") return "DELIVERED";
  if (s === "read" || s === "opened" || s === "open" || s === "click" || s === "clicked") return "READ";
  if (s === "failed" || s === "undelivered" || s === "bounce" || s === "bounced" || s === "dropped" || s === "rejected") return "FAILED";
  if (s === "sent" || s === "processed" || s === "queued") return "SENT";
  return null;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const formObj: Record<string, string> = {};
      formData.forEach((value, key) => {
        formObj[key] = value.toString();
      });
      body = formObj;
    } else {
      return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 400 });
    }

    let externalId: string | null = null;
    let messageId: string | null = null;
    let rawStatus: string | null = null;
    let errorMessage: string | null = null;
    let provider = "generic";

    // 1. WhatsApp / Meta Cloud API format
    if (body.entry && Array.isArray(body.entry)) {
      provider = "meta_whatsapp";
      const change = body.entry[0]?.changes?.[0]?.value;
      const statusObj = change?.statuses?.[0];
      if (statusObj) {
        externalId = statusObj.id;
        rawStatus = statusObj.status;
        if (statusObj.errors && statusObj.errors.length > 0) {
          errorMessage = statusObj.errors[0]?.message || statusObj.errors[0]?.title;
        }
      }
    }
    // 2. Twilio format
    else if (body.MessageSid || body.SmsSid) {
      provider = "twilio";
      externalId = body.MessageSid || body.SmsSid;
      rawStatus = body.MessageStatus || body.SmsStatus;
      if (body.ErrorMessage || body.ErrorCode) {
        errorMessage = `Twilio Error ${body.ErrorCode}: ${body.ErrorMessage}`;
      }
    }
    // 3. SendGrid format (array of events)
    else if (Array.isArray(body) && body[0]?.sg_message_id) {
      provider = "sendgrid";
      const ev = body[0];
      externalId = ev.sg_message_id.split(".")[0];
      rawStatus = ev.event;
      if (ev.reason) errorMessage = ev.reason;
    }
    // 4. Gupshup / Interakt / Resend format
    else if (body.messageId || body.externalId || body.id) {
      provider = body.provider || "generic";
      externalId = body.externalId || body.messageId || body.id;
      messageId = body.internalMessageId || null;
      rawStatus = body.status || body.event || body.type;
      errorMessage = body.error || body.reason || null;
    }

    if (!rawStatus) {
      return NextResponse.json({ ok: true, ignored: true, reason: "No recognized status in webhook payload" });
    }

    const normalizedStatus = normalizeStatus(rawStatus);
    if (!normalizedStatus) {
      return NextResponse.json({ ok: true, ignored: true, reason: `Unmapped status: ${rawStatus}` });
    }

    // Find the Message record
    const message = await prisma.message.findFirst({
      where: {
        OR: [
          ...(externalId ? [{ externalId }] : []),
          ...(messageId ? [{ id: messageId }] : []),
        ],
      },
    });

    if (!message) {
      return NextResponse.json({
        ok: true,
        matched: false,
        reason: "No message record found matching externalId or messageId",
        externalId,
      });
    }

    // Update Message status
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: normalizedStatus,
      },
    });

    // Record CollectionEvent on Customer Timeline if customerId exists
    if (message.customerId) {
      await prisma.collectionEvent.create({
        data: {
          organizationId: message.organizationId,
          customerId: message.customerId,
          invoiceId: message.invoiceId || null,
          type: `message_${normalizedStatus.toLowerCase()}`,
          description: `Message to ${message.recipient} via ${message.channel} marked as ${normalizedStatus} (${provider})`,
          metadata: {
            messageId: message.id,
            externalId,
            channel: message.channel,
            provider,
            status: normalizedStatus,
            rawStatus,
            error: errorMessage,
          },
        },
      });
    }

    // Write audit log
    await writeAudit({
      organizationId: message.organizationId,
      userId: null,
      action: "DELIVERY_STATUS_UPDATED",
      entityType: "message",
      entityId: message.id,
      metadata: {
        status: normalizedStatus,
        rawStatus,
        provider,
        externalId,
        recipient: message.recipient,
      },
    });

    return NextResponse.json({
      ok: true,
      matched: true,
      messageId: message.id,
      channel: message.channel,
      status: normalizedStatus,
      provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Support GET challenge verification (required for WhatsApp Webhook Setup)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "duespilot_webhook_verify_token";

  if (mode === "subscribe" && token === expectedToken) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: true, endpoint: "DuesPilot Delivery Webhook" });
}
