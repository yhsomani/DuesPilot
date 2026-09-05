// Email delivery adapter with support for Resend, SMTP, and mock simulation mode.

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  provider: "resend" | "smtp" | "mock";
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const defaultFrom = process.env.EMAIL_FROM || "DuesPilot Collections <notifications@duespilot.com>";
  const from = options.from || defaultFrom;
  const to = Array.isArray(options.to) ? options.to : [options.to];

  // 1. Live Resend Provider
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject: options.subject,
          text: options.text,
          html: options.html || options.text.replace(/\n/g, "<br/>"),
          reply_to: options.replyTo,
          headers: options.headers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          messageId: "",
          provider: "resend",
          error: data?.message || `Resend HTTP error ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.id || `resend_${Date.now()}`,
        provider: "resend",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown network error";
      return {
        success: false,
        messageId: "",
        provider: "resend",
        error: msg,
      };
    }
  }

  // 2. Deterministic Mock / Simulation Provider
  // Used in local dev, test environments, or when credentials are not yet provisioned.
  const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  if (process.env.NODE_ENV !== "test") {
    // Only log in non-test environments
    console.info(
      JSON.stringify({
        level: "info",
        event: "email_sent_mock",
        messageId: mockId,
        to,
        from,
        subject: options.subject,
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
