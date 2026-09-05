import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let event: Record<string, unknown> = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventType = (event.type || event.event || "payment.captured") as string;
    const organizationId = (event.organizationId ||
      (event.data as Record<string, unknown>)?.organizationId ||
      "system") as string;

    // Optional webhook signature verification logic can be mounted here when STRIPE_WEBHOOK_SECRET / RAZORPAY_WEBHOOK_SECRET are configured.
    const signature = req.headers.get("x-razorpay-signature") || req.headers.get("stripe-signature");

    await writeAudit({
      organizationId: typeof organizationId === "string" ? organizationId : "system",
      userId: null,
      action: "SETTINGS_UPDATE",
      entityType: "billing_webhook",
      metadata: {
        eventType,
        hasSignature: Boolean(signature),
      },
    });

    return Response.json({ received: true, eventType });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 }
    );
  }
}
