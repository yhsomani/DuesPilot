import { daysOverdue } from "@/lib/dates";
import type { QueuePriority } from "@/lib/types";

export interface QueueComputeInput {
  promiseBroken: boolean;
  mostOverdueDueDate: Date;
  totalOverdue: number;
  riskScore: number;
  lastEventType: string | null;
}

export interface QueueComputeResult {
  priority: QueuePriority;
  daysOverdue: number;
  status: string;
  nextAction: string;
  why: string;
}

export function statusView(raw: string): string {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function computeQueueItem(input: QueueComputeInput): QueueComputeResult {
  const days = daysOverdue(input.mostOverdueDueDate);
  const reasons: string[] = [];
  if (input.promiseBroken) reasons.push("Promise was broken");
  if (days > 7) reasons.push(`Overdue ${days} days`);
  if (input.totalOverdue > 400000) reasons.push("Large outstanding amount");
  else if (input.riskScore > 70) reasons.push("High risk score");

  let priority: QueuePriority = "low";
  if (input.promiseBroken || days > 30 || input.totalOverdue > 400000) {
    priority = "high";
  } else if (days > 7 || input.riskScore > 70) {
    priority = "medium";
  }

  const status = input.promiseBroken
    ? "Promise broken"
    : input.lastEventType
    ? statusView(input.lastEventType)
    : `${days} days overdue`;

  const nextAction =
    priority === "high"
      ? input.promiseBroken
        ? "Call now — promise overdue"
        : "Call now"
      : priority === "medium"
      ? "WhatsApp follow-up"
      : "Send due date notice";

  return {
    priority,
    daysOverdue: days,
    status,
    nextAction,
    why: reasons.join(" · ") || "Overdue balance",
  };
}