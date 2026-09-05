export function daysOverdue(dueDate: Date, ref: Date = new Date()): number {
  const diff = ref.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function daysUntilDue(dueDate: Date, ref: Date = new Date()): number {
  const diff = dueDate.getTime() - ref.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}