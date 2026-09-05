"use client";

import { useState, useEffect } from "react";
import {
  Workflow,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Plus,
  Mail,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowRule {
  id: string;
  name: string;
  triggerType: "DUE_SOON" | "OVERDUE" | "PROMISE_BROKEN" | "HIGH_RISK";
  daysRelative: number;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | "TASK";
  minAmount?: number;
  maxAmount?: number;
  templateName?: string;
  includePaymentLink?: boolean;
  enabled: boolean;
}

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  isSystemDefault?: boolean;
  rules: WorkflowRule[];
}

interface SimulationMatch {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  outstandingAmount: number;
  dueDate: string;
  ruleId: string;
  ruleName: string;
  channel: string;
  daysRelative: number;
  recipient?: string;
}

interface DryRunResult {
  dryRun: boolean;
  evaluatedCount: number;
  matchedCount: number;
  sentCount: number;
  matches: SimulationMatch[];
}

interface LiveRunResult {
  dryRun: boolean;
  evaluatedCount: number;
  matchedCount: number;
  sentCount: number;
  failedCount?: number;
}

const DEFAULT_DISPLAY_RULES: WorkflowRule[] = [
  {
    id: "rule_1",
    name: "Pre-Due Courtesy Reminder",
    triggerType: "DUE_SOON",
    daysRelative: -3,
    channel: "EMAIL",
    templateName: "Pre-Due Courtesy Notice",
    includePaymentLink: true,
    enabled: true,
  },
  {
    id: "rule_2",
    name: "1-Day Overdue Soft Reminder",
    triggerType: "OVERDUE",
    daysRelative: 1,
    channel: "WHATSAPP",
    templateName: "First Overdue WhatsApp Ping",
    includePaymentLink: true,
    enabled: true,
  },
  {
    id: "rule_3",
    name: "7-Day Overdue Urgency Escalation",
    triggerType: "OVERDUE",
    daysRelative: 7,
    channel: "EMAIL",
    templateName: "1-Week Overdue Statement",
    includePaymentLink: true,
    enabled: true,
  },
  {
    id: "rule_4",
    name: "15-Day Overdue WhatsApp Direct",
    triggerType: "OVERDUE",
    daysRelative: 15,
    channel: "WHATSAPP",
    templateName: "Installment Settlement Offer",
    includePaymentLink: true,
    enabled: true,
  },
  {
    id: "rule_5",
    name: "30-Day MSME Statutory Legal Notice",
    triggerType: "OVERDUE",
    daysRelative: 30,
    channel: "EMAIL",
    templateName: "Section 15 & 16 MSME Notice",
    includePaymentLink: true,
    enabled: true,
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);

  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveRunResult, setLiveRunResult] = useState<LiveRunResult | null>(null);

  const [addRuleModalOpen, setAddRuleModalOpen] = useState(false);
  const [submittingRule, setSubmittingRule] = useState(false);
  const [newRule, setNewRule] = useState<{
    name: string;
    triggerType: "DUE_SOON" | "OVERDUE" | "PROMISE_BROKEN" | "HIGH_RISK";
    channel: "WHATSAPP" | "EMAIL" | "SMS";
    daysRelative: number;
    minAmount: number;
    includePaymentLink: boolean;
  }>({
    name: "",
    triggerType: "OVERDUE",
    channel: "WHATSAPP",
    daysRelative: 7,
    minAmount: 1000,
    includePaymentLink: true,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workflows");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            if (data.workflows && data.workflows.length > 0) {
              setWorkflows(data.workflows);
            } else {
              setWorkflows([
                {
                  id: "wf_default",
                  name: "Standard MSME 45-Day Dunning Cadence",
                  description: "Automated multi-channel escalation aligned with MSMED Act 2006",
                  enabled: true,
                  isSystemDefault: true,
                  rules: DEFAULT_DISPLAY_RULES,
                },
              ]);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setWorkflows([
            {
              id: "wf_default",
              name: "Standard MSME 45-Day Dunning Cadence",
              description: "Automated multi-channel escalation aligned with MSMED Act 2006",
              enabled: true,
              isSystemDefault: true,
              rules: DEFAULT_DISPLAY_RULES,
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Handle dry run execution
  const handleDryRun = async () => {
    try {
      setDryRunLoading(true);
      const res = await fetch("/api/jobs/workflows-runner?dry_run=1");
      if (res.ok) {
        const data = await res.json();
        setDryRunResult(data);
      }
    } catch (err) {
      console.error("Failed to execute dry run:", err);
    } finally {
      setDryRunLoading(false);
    }
  };

  // Handle live batch execution
  const handleExecuteLive = async () => {
    try {
      setLiveRunning(true);
      const res = await fetch("/api/jobs/workflows-runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiveRunResult(data);
        setLiveModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to execute live batch:", err);
    } finally {
      setLiveRunning(false);
    }
  };

  // Handle adding new rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim()) return;

    try {
      setSubmittingRule(true);
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        setAddRuleModalOpen(false);
        setNewRule({
          name: "",
          triggerType: "OVERDUE",
          channel: "WHATSAPP",
          daysRelative: 7,
          minAmount: 1000,
          includePaymentLink: true,
        });
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Failed to save rule:", err);
    } finally {
      setSubmittingRule(false);
    }
  };

  // Extract all active rules across workflows or fallback to default
  const activeRules =
    workflows.length > 0 && workflows[0].rules && workflows[0].rules.length > 0
      ? workflows[0].rules
      : DEFAULT_DISPLAY_RULES;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Automated Dunning Cadences
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure multi-channel automated collection workflows, time-relative milestones, and statutory MSME escalation steps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDryRun}
            disabled={dryRunLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
          >
            <Play className={cn("h-3.5 w-3.5 text-blue-600", dryRunLoading && "animate-spin")} />
            <span>Test Run (Dry Run)</span>
          </button>

          <button
            type="button"
            onClick={() => setLiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Execute Cadence Batch</span>
          </button>

          <button
            type="button"
            onClick={() => setAddRuleModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {/* Security & Guard KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Cadence Plan</span>
            <span className="text-sm font-bold text-slate-900">MSME 45-Day Statutory</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Dispute & Promise Guard</span>
            <span className="text-sm font-bold text-emerald-700">100% Guarded</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Outreach Throttle</span>
            <span className="text-sm font-bold text-slate-900">24h Customer Cooldown</span>
          </div>
        </div>
      </div>

      {/* Live Run Completion Banner */}
      {liveRunResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-900">Cadence Execution Complete</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Evaluated {liveRunResult.evaluatedCount} invoices and Dispatched {liveRunResult.sentCount} automated outreach messages across tenant debtors.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLiveRunResult(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dry Run Simulation Result */}
      {dryRunResult && (
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 text-blue-900 space-y-3 shadow-2xs animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-blue-900">Simulation Complete (Dry Run)</h4>
                <p className="text-xs text-blue-700 mt-0.5">
                  Evaluated {dryRunResult.evaluatedCount} candidate invoices, matched {dryRunResult.matchedCount} rules ready for dispatch.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDryRunResult(null)}
              className="text-blue-700 hover:text-blue-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {dryRunResult.matches && dryRunResult.matches.length > 0 && (
            <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Invoice #</th>
                      <th className="px-3.5 py-2.5">Customer</th>
                      <th className="px-3.5 py-2.5">Outstanding</th>
                      <th className="px-3.5 py-2.5">Triggered Rule</th>
                      <th className="px-3.5 py-2.5">Channel</th>
                      <th className="px-3.5 py-2.5">Recipient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dryRunResult.matches.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{m.invoiceNumber}</td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-700">{m.customerName}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          ₹{m.outstandingAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3.5 py-2.5 text-blue-700 font-medium">{m.ruleName}</td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                              m.channel === "WHATSAPP"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-50 text-blue-700"
                            )}
                          >
                            {m.channel}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 font-mono text-[11px]">
                          {m.recipient || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cadence Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Configured Cadence Rules</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rules execute automatically in sequential priority order when invoices cross relative aging milestones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {activeRules.map((rule, idx) => (
            <div
              key={rule.id || idx}
              className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    rule.channel === "WHATSAPP"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  )}
                >
                  {rule.channel === "WHATSAPP" ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        rule.triggerType === "DUE_SOON"
                          ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                          : "bg-rose-50 text-rose-700 border border-rose-200/60"
                      )}
                    >
                      {rule.daysRelative < 0
                        ? `T${rule.daysRelative} Days (Pre-Due)`
                        : `T+${rule.daysRelative} Days (Overdue)`}
                    </span>
                    {rule.includePaymentLink && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        Dynamic Payment Link
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Channel: <span className="font-semibold text-slate-700">{rule.channel}</span> · Minimum:{" "}
                    <span className="font-semibold text-slate-700">₹{rule.minAmount || 500}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold",
                    rule.enabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      rule.enabled ? "bg-emerald-500" : "bg-slate-400"
                    )}
                  />
                  {rule.enabled ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Cadence Batch Confirmation Modal */}
      {liveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div role="dialog" className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Send className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold">Execute Live Cadence Batch</h3>
              </div>
              <button
                type="button"
                onClick={() => setLiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will evaluate all active customer invoices across your organization against the 45-day cadence rules and dispatch live Email and WhatsApp outreach with dynamic payment links.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Invoices with active disputes or unexpired promises to pay are safely bypassed.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLiveModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteLive}
                disabled={liveRunning}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {liveRunning && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Escalation Rule Modal */}
      {addRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div role="dialog" className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Plus className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold">Add Cadence Escalation Rule</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="3-Day Overdue Courtesy Ping"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trigger Type
                  </label>
                  <select
                    value={newRule.triggerType}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        triggerType: e.target.value as "DUE_SOON" | "OVERDUE" | "PROMISE_BROKEN" | "HIGH_RISK",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="DUE_SOON">DUE_SOON</option>
                    <option value="PROMISE_BROKEN">PROMISE_BROKEN</option>
                    <option value="HIGH_RISK">HIGH_RISK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Channel
                  </label>
                  <select
                    value={newRule.channel}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        channel: e.target.value as "WHATSAPP" | "EMAIL" | "SMS",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Days Relative
                  </label>
                  <input
                    type="number"
                    value={newRule.daysRelative}
                    onChange={(e) =>
                      setNewRule({ ...newRule, daysRelative: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newRule.minAmount}
                    onChange={(e) =>
                      setNewRule({ ...newRule, minAmount: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="incPlink"
                  checked={newRule.includePaymentLink}
                  onChange={(e) =>
                    setNewRule({ ...newRule, includePaymentLink: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="incPlink" className="text-xs text-slate-700">
                  Include Dynamic UPI & NetBanking payment link
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddRuleModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRule}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
