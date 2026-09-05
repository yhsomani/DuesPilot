"use client";

import { useEffect, useRef, useState } from "react";
import { apiPost, ApiError } from "@/lib/api";
import type { QueueItem } from "@/lib/types";

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
      setError(e instanceof ApiError ? e.message : "Failed");
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
      setError(e instanceof ApiError ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-actions-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="all-actions-title" className="font-semibold text-gray-900">{item.customer}</h3>
              <p className="text-sm text-gray-500">
                {item.daysOverdue} days overdue
                {item.why && ` · ${item.why}`}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {(["actions", "note"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "actions" ? "Quick actions" : "Log note"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        {tab === "actions" && (
          <div className="p-5 space-y-3">
            <button
              ref={firstButtonRef}
              disabled={saving}
              onClick={() => logEvent("CALL", `Called ${item.customer} about overdue balance`)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-medium text-gray-900">📞 Log call</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Record that you called the customer
              </span>
            </button>
            <button
              disabled={saving}
              onClick={() =>
                logEvent(
                  "WHATSAPP",
                  `Sent WhatsApp to ${item.customer} about overdue balance`
                )
              }
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-medium text-gray-900">
                💬 Log WhatsApp
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Record a WhatsApp message sent
              </span>
            </button>
            <button
              disabled={saving}
              onClick={() =>
                logEvent("EMAIL", `Sent follow-up email to ${item.customer}`)
              }
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-medium text-gray-900">
                📧 Log email
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Record an email follow-up
              </span>
            </button>
            {item.promiseId && (
              <>
                <hr className="border-gray-100" />
                <button
                  disabled={saving}
                  onClick={async () => {
                    if (!item.promiseId) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await apiPost(`/api/promises/${item.promiseId}/manage`, {
                        action: "mark_kept",
                        note: "Marked as kept by agent",
                      });
                      onDone();
                    } catch (e) {
                      setError(e instanceof ApiError ? e.message : "Failed");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-green-800">
                    ✓ Mark promise kept
                  </span>
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
                        note: "Marked as broken by agent",
                      });
                      onDone();
                    } catch (e) {
                      setError(e instanceof ApiError ? e.message : "Failed");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-red-800">
                    ✗ Mark promise broken
                  </span>
                </button>
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
              placeholder="What did you do or find? Use @name to tag a teammate…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
            <button
              disabled={saving || !note.trim()}
              onClick={() => managePromise("add_note")}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}