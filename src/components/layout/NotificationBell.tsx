"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import type { NotificationRow } from "@/lib/repo";
import { cn } from "@/lib/utils";

const kindStyles: Record<NotificationRow["kind"], string> = {
  promise_broken: "bg-red-50 border-red-200",
  dispute_open: "bg-purple-50 border-purple-200",
  promise_due_today: "bg-amber-50 border-amber-200",
  system: "bg-gray-50 border-gray-200",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<NotificationRow[]>("/api/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const visible = (notifications ?? []).filter((n) => !dismissed.has(n.id));
  const unread = visible.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => setDismissed(new Set(notifications?.map((n) => n.id)))}
                className="text-xs font-medium text-blue-600 hover:text-blue-500"
              >
                Dismiss all
              </button>
            )}
          </div>
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {visible.map((n) => (
                <li key={n.id} className={cn("px-4 py-3", kindStyles[n.kind], "first:border-t-0")}>
                  <Link href={n.link ?? "#"} className="block" onClick={() => setOpen(false)}>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="mt-0.5 text-xs text-gray-600">{n.message}</p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}