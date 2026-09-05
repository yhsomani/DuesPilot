"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Clock, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { api } from "@/lib/api";
import type { NotificationRow } from "@/lib/repo";
import { cn } from "@/lib/utils";

const kindConfig: Record<
  NotificationRow["kind"],
  { bg: string; border: string; icon: typeof Clock; text: string }
> = {
  promise_broken: {
    bg: "bg-rose-50/70",
    border: "border-rose-100",
    icon: AlertCircle,
    text: "text-rose-700",
  },
  dispute_open: {
    bg: "bg-purple-50/70",
    border: "border-purple-100",
    icon: AlertTriangle,
    text: "text-purple-700",
  },
  promise_due_today: {
    bg: "bg-amber-50/70",
    border: "border-amber-100",
    icon: Clock,
    text: "text-amber-700",
  },
  system: {
    bg: "bg-slate-50/70",
    border: "border-slate-100",
    icon: Info,
    text: "text-slate-700",
  },
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<NotificationRow[]>("/api/notifications")
      .then((res) => setNotifications(Array.isArray(res) ? res : []))
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

  const list = Array.isArray(notifications) ? notifications : [];
  const visible = list.filter((n) => n && n.id && !dismissed.has(n.id));
  const unread = visible.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-2xs"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs animate-in zoom-in-50">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifications</span>
              {unread > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-md">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => setDismissed(new Set(notifications?.map((n) => n.id)))}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Dismiss all
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-100 mb-2">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">All caught up</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No unread alerts or notifications.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {visible.map((n) => {
                const config = (n.kind && kindConfig[n.kind]) ? kindConfig[n.kind] : kindConfig.system;
                const Icon = config.icon;
                return (
                  <li key={n.id} className={cn("p-3.5 transition-colors hover:bg-slate-50/80", config.bg)}>
                    <Link
                      href={n.link ?? "#"}
                      className="flex items-start gap-3 block"
                      onClick={() => setOpen(false)}
                    >
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 mt-0.5", config.border, config.text, "bg-white")}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400 font-medium">
                          {new Date(n.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
