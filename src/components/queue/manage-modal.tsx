"use client";

import { useEffect, useRef, useState } from "react";
import { apiPost, ApiError } from "@/lib/api";
import type { QueueItem } from "@/lib/types";
import { Phone, MessageSquare, Mail, CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  item: QueueItem;
  onClose: () => void;
  onDone: () => void;
}

export function AllActionsModal({ item, onClose, onDone }: Props) {
  const [tab, setTab] = useState<"actions" | "note">("actions");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logEvent = async (type: string, description: string) => {
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/collection-events", {
        customerId: item.customerId,
        type,
        description,
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to record collection activity");
    } finally {
      setSaving(false);
    }
  };

  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const managePromise = async (
    action: "mark_broken" | "mark_kept" | "add_note"
  ) => {
    if (!note.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const endpoint = item.promiseId
        ? `/api/promises/${item.promiseId}/manage`
        : null;
      if (endpoint) {
        await apiPost(endpoint, { action, note });
      } else {
        await apiPost("/api/collection-events", {
          customerId: item.customerId,
          type: "NOTE",
          description: note,
        });
      }
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-actions-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 id="all-actions-title" className="font-bold text-slate-900 text-base">{item.customer}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {item.daysOverdue} days overdue
              {item.why && ` · ${item.why}`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white">
          {(["actions", "note"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50/30"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t === "actions" ? "Quick Action Logging" : "Internal Activity Note"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tab === "actions" && (
          <div className="p-5 space-y-2.5">
            <button
              ref={firstButtonRef}
              disabled={saving}
              onClick={() => logEvent("CALL", `Called ${item.customer} regarding overdue balance`)}
              className="w-full flex items-start gap-3 rounded-2xl border border-slate-200/80 p-3.5 text-left hover:bg-blue-50/50 hover:border-blue-200 transition-all disabled:opacity-50 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-900">Log Phone Call</span>
                <span className="text-[11px] text-slate-500">Record an outgoing dunning call to debtor accounts</span>
              </div>
            </button>

            <button
              disabled={saving}
              onClick={() =>
                logEvent(
                  "WHATSAPP",
                  `Sent WhatsApp to ${item.customer} regarding overdue balance`
                )
              }
              className="w-full flex items-start gap-3 rounded-2xl border border-slate-200/80 p-3.5 text-left hover:bg-emerald-50/50 hover:border-emerald-200 transition-all disabled:opacity-50 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-900">Log WhatsApp Message</span>
                <span className="text-[11px] text-slate-500">Record a WhatsApp template or dynamic payment link sent</span>
              </div>
            </button>

            <button
              disabled={saving}
              onClick={() =>
                logEvent("EMAIL", `Sent follow-up email reminder to ${item.customer}`)
              }
              className="w-full flex items-start gap-3 rounded-2xl border border-slate-200/80 p-3.5 text-left hover:bg-purple-50/50 hover:border-purple-200 transition-all disabled:opacity-50 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block group-hover:text-purple-900">Log Formal Email</span>
                <span className="text-[11px] text-slate-500">Record a statement or statutory notice sent via email</span>
              </div>
            </button>

            {item.promiseId && (
              <>
                <div className="pt-2 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Promise Settlement</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={saving}
                    onClick={async () => {
                      if (!item.promiseId) return;
                      setSaving(true);
                      setError(null);
                      try {
                        await apiPost(`/api/promises/${item.promiseId}/manage`, {
                          action: "mark_kept",
                          note: "Payment confirmed and verified by agent",
                        });
                        onDone();
                      } catch (e) {
                        setError(e instanceof ApiError ? e.message : "Failed to record promise");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 py-2.5 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Promise Kept</span>
                  </button>

                  <button
                    disabled={saving}
                    onClick={async () => {
                      if (!item.promiseId) return;
                      setSaving(true);
                      setError(null);
                      try {
                        await apiPost(`/api/promises/${item.promiseId}/manage`, {
                          action: "mark_broken",
                          note: "Promise deadline lapsed without settlement",
                        });
                        onDone();
                      } catch (e) {
                        setError(e instanceof ApiError ? e.message : "Failed to record promise");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 py-2.5 px-3 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>Promise Broken</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "note" && (
          <div className="p-5 space-y-3">
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record notes from phone conversations, disputed line items, or settlement arrangements…"
              className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-slate-50/50 leading-relaxed"
            />
            <Button
              disabled={!note.trim()}
              loading={saving}
              onClick={() => managePromise("add_note")}
              className="w-full"
            >
              Save Customer Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
