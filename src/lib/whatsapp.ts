// WhatsApp Business API adapter with multi-gateway routing (Gupshup, Interakt, Twilio, Meta Cloud API)
// and deterministic mock simulation mode.

export interface SendWhatsAppOptions {
  to: string; // Recipient phone number (E.164 format or Indian 10-digit mobile)
  message: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  mediaUrl?: string;
  mediaType?: "image" | "document" | "audio" | "video";
  quickReplies?: string[];
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId: string;
  provider: "gupshup" | "interakt" | "twilio" | "meta" | "mock";
  error?: string;
}

/**
 * Normalizes phone numbers to standard E.164 format (defaults to +91 for 10-digit Indian numbers).
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}

export async function sendWhatsAppMessage(
  options: SendWhatsAppOptions
): Promise<SendWhatsAppResult> {
  const normalizedTo = normalizePhoneNumber(options.to);

  // 1. Meta / WhatsApp Cloud API
  const metaToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (metaToken && metaPhoneId) {
    try {
      const recipientNumber = normalizedTo.replace("+", "");
      const res = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientNumber,
          type: "text",
          text: { preview_url: true, body: options.message },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          messageId: "",
          provider: "meta",
          error: data?.error?.message || `Meta WhatsApp API error ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `meta_${Date.now()}`,
        provider: "meta",
      };
    } catch (err: unknown) {
      return {
        success: false,
        messageId: "",
        provider: "meta",
        error: err instanceof Error ? err.message : "Meta API network error",
      };
    }
  }

  // 2. Interakt Gateway
  const interaktKey = process.env.INTERAKT_API_KEY?.trim();
  if (interaktKey) {
    try {
      const res = await fetch("https://api.interakt.ai/v1/public/message/", {
        method: "POST",
        headers: {
          Authorization: `Basic ${interaktKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countryCode: normalizedTo.slice(1, 3),
          phoneNumber: normalizedTo.slice(3),
          type: "Text",
          data: { message: options.message },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          messageId: "",
          provider: "interakt",
          error: data?.message || `Interakt error ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.id || `interakt_${Date.now()}`,
        provider: "interakt",
      };
    } catch (err: unknown) {
      return {
        success: false,
        messageId: "",
        provider: "interakt",
        error: err instanceof Error ? err.message : "Interakt network error",
      };
    }
  }

  // 3. Gupshup Gateway
  const gupshupKey = process.env.GUPSHUP_API_KEY?.trim();
  const gupshupAppName = process.env.GUPSHUP_APP_NAME?.trim();
  const gupshupSrc = process.env.GUPSHUP_SRC_PHONE?.trim() || "917834811114";
  if (gupshupKey && gupshupAppName) {
    try {
      const formData = new URLSearchParams();
      formData.append("channel", "whatsapp");
      formData.append("source", gupshupSrc);
      formData.append("destination", normalizedTo.replace("+", ""));
      formData.append("message", JSON.stringify({ type: "text", text: options.message }));
      formData.append("src.name", gupshupAppName);

      const res = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
        method: "POST",
        headers: {
          apikey: gupshupKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        return {
          success: false,
          messageId: "",
          provider: "gupshup",
          error: data?.message || `Gupshup error ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.messageId || `gupshup_${Date.now()}`,
        provider: "gupshup",
      };
    } catch (err: unknown) {
      return {
        success: false,
        messageId: "",
        provider: "gupshup",
        error: err instanceof Error ? err.message : "Gupshup network error",
      };
    }
  }

  // 4. Twilio WhatsApp Gateway
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFromNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim();
  if (twilioSid && twilioAuthToken && twilioFromNumber) {
    try {
      const authHeader = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");
      const formParams = new URLSearchParams();
      formParams.append("From", `whatsapp:${twilioFromNumber}`);
      formParams.append("To", `whatsapp:${normalizedTo}`);
      formParams.append("Body", options.message);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formParams.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          messageId: "",
          provider: "twilio",
          error: data?.message || `Twilio error ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.sid || `twilio_${Date.now()}`,
        provider: "twilio",
      };
    } catch (err: unknown) {
      return {
        success: false,
        messageId: "",
        provider: "twilio",
        error: err instanceof Error ? err.message : "Twilio network error",
      };
    }
  }

  // 5. Deterministic Mock / Simulation Provider
  const mockId = `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  if (process.env.NODE_ENV === "production") {
    console.warn(
      JSON.stringify({
        level: "warn",
        alert: "PRODUCTION_SIMULATION_WARNING",
        message: "WhatsApp dispatch running in simulation mode because no live WhatsApp gateway credentials are configured.",
        event: "whatsapp_sent_mock",
        messageId: mockId,
        to: normalizedTo,
        messagePreview: options.message.slice(0, 80),
        timestamp: new Date().toISOString(),
      })
    );
  } else if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        level: "info",
        event: "whatsapp_sent_mock",
        messageId: mockId,
        to: normalizedTo,
        messagePreview: options.message.slice(0, 80),
        timestamp: new Date().toISOString(),
      })
    );
  }

  return {
    success: true,
    messageId: mockId,
    provider: "mock",
  };
}
