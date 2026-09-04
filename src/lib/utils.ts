import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount}`;
}

export function daysOverdue(dueDate: Date): number {
  const now = new Date();
  const diff = now.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function daysUntilDue(dueDate: Date): number {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getAgingBucket(dueDate: Date): string {
  const days = daysOverdue(dueDate);
  if (days === 0) return "Current";
  if (days <= 30) return "1-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "90+ days";
}

export function getPriorityColor(daysOverdue: number, amount: number): string {
  if (daysOverdue > 30 && amount > 100000) return "text-red-600 bg-red-50 border-red-200";
  if (daysOverdue > 14) return "text-orange-600 bg-orange-50 border-orange-200";
  if (daysOverdue > 0) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-green-600 bg-green-50 border-green-200";
}
