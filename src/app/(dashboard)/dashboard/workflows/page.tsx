"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Workflow,
  Play,
  Eye,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Zap,
  RefreshCw,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";

interface WorkflowRule {
  id: string;
  name: string;
  triggerType: "DUE_SOON" | "OVERDUE" | "PROMISE_BROKEN" | "HIGH_RISK";
  daysRelative: number;
  minAmount?: number;
  maxAmount?: number;
  minRiskScore?: number;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | "TASK";
  templateId?: string;
  templateName?: string;
  includePaymentLink?: boolean;
  enabled: boolean;
  cooldownHours?: number;
}

interface WorkflowCadence {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  rules: WorkflowRule[];
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DryRunMatch {
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
  recipient: string;
}

interface DryRunResult {
  dryRun: boolean;
  evaluatedCount: number;
  matchedCount: number;
  sentCount: number;
  matches: DryRunMatch[];
}

interface LiveRunResult {
  dryRun: boolean;
  evaluatedCount: number;
  matchedCount: number;
  sentCount: number;
  failedCount: number;
  results: Array<{
    invoiceId: string;
    invoiceNumber: string;
    ruleId: string;
    channel: string;
    recipient: string;
    success: boolean;
    error?: string;
  }>;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowCadence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Runner state
  const [runningDryRun, setRunningDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [runningLive, setRunningLive] = useState(false);
  const [liveResult, setLiveResult] = useState<LiveRunResult | null>(null);
  const [showConfirmLive, setShowConfirmLive] = useState(false);

  // Create rule modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState<Partial<WorkflowRule>>({
    name: "",
    triggerType: "OVERDUE",
    daysRelative: 3,
    channel: "EMAIL",
    minAmount: 500,
    includePaymentLink: true,
    enabled: true,
    cooldownHours: 24,
  });

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await api<{ workflows: WorkflowCadence[] }>("/api/workflows");
      setWorkflows(res.workflows || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workflow cadences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const res = await api<{ workflows: WorkflowCadence[] }>("/api/workflows");
        if (active) {
          setWorkflows(res.workflows || []);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load workflow cadences");
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleRule = async (workflowId: string, ruleId: string) => {
    const wf = workflows.find((w) => w.id === workflowId);
    if (!wf) return;

    const updatedRules = wf.rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );

    // Optimistic UI update
    setWorkflows((prev) =>
      prev.map((w) => (w.id === workflowId ? { ...w, rules: updatedRules } : w))
    );

    try {
      if (wf.isSystemDefault) {
        // Create custom workflow from system default
        await api("/api/workflows", {
          method: "POST",
          body: JSON.stringify({
            name: "Custom Dunning Cadence",
            description: "Customized escalation rules based on system default",
            enabled: true,
            rules: updatedRules,
          }),
        });
        await fetchWorkflows();
      } else {
        await api(`/api/workflows/${workflowId}`, {
          method: "PATCH",
          body: JSON.stringify({ rules: updatedRules }),
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update rule status");
      await fetchWorkflows();
    }
  };

  const handleRunDryRun = async () => {
    setRunningDryRun(true);
    setDryRunResult(null);
    try {
      const res = await api<DryRunResult>("/api/jobs/workflows-runner?dry_run=1", {
        method: "POST",
      });
      setDryRunResult(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to execute dry run simulation");
    } finally {
      setRunningDryRun(false);
    }
  };

  const handleExecuteLiveBatch = async () => {
    setShowConfirmLive(false);
    setRunningLive(true);
    setLiveResult(null);
    try {
      const res = await api<LiveRunResult>("/api/jobs/workflows-runner", {
        method: "POST",
      });
      setLiveResult(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to execute live cadence batch");
    } finally {
      setRunningLive(false);
    }
  };

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name) return;

    setCreating(true);
    try {
      const currentWf = workflows[0];
      const newRuleObj: WorkflowRule = {
        id: `rule_custom_${Date.now()}`,
        name: newRule.name || "Custom Rule",
        triggerType: newRule.triggerType || "OVERDUE",
        daysRelative: Number(newRule.daysRelative ?? 1),
        minAmount: Number(newRule.minAmount ?? 0),
        channel: newRule.channel || "EMAIL",
        includePaymentLink: !!newRule.includePaymentLink,
        enabled: true,
        cooldownHours: Number(newRule.cooldownHours ?? 24),
      };

      const existingRules = currentWf ? currentWf.rules : [];
      const updatedRules = [...existingRules, newRuleObj];

      if (!currentWf || currentWf.isSystemDefault) {
        await api("/api/workflows", {
          method: "POST",
          body: JSON.stringify({
            name: "Custom Dunning Cadence",
            description: "Customized escalation rules",
            enabled: true,
            rules: updatedRules,
          }),
        });
      } else {
        await api(`/api/workflows/${currentWf.id}`, {
          method: "PATCH",
          body: JSON.stringify({ rules: updatedRules }),
        });
      }

      setShowCreateModal(false);
      setNewRule({
        name: "",
        triggerType: "OVERDUE",
        daysRelative: 3,
        channel: "EMAIL",
        minAmount: 500,
        includePaymentLink: true,
        enabled: true,
        cooldownHours: 24,
      });
      await fetchWorkflows();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create workflow rule");
    } finally {
      setCreating(false);
    }
  };

  const activeRulesCount = workflows.reduce(
    (acc, w) => acc + (Array.isArray(w.rules) ? w.rules.filter((r) => r.enabled).length : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Automated Dunning Cadences</h1>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Active Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Multi-channel progressive follow-ups (Email & WhatsApp), risk-tier filters, dispute guards, and statutory MSME legal demands.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunDryRun}
            disabled={runningDryRun}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <Eye className="h-4 w-4 text-gray-500" />
            {runningDryRun ? "Simulating..." : "Test Run (Dry Run)"}
          </button>

          <button
            onClick={() => setShowConfirmLive(true)}
            disabled={runningLive}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {runningLive ? "Dispatching..." : "Execute Cadence Batch"}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Active Rules</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Workflow className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{activeRulesCount}</div>
          <div className="mt-1 text-xs text-gray-500">Configured across escalations</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Dispute & Promise Guard</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">100% Guarded</div>
          <div className="mt-1 text-xs text-gray-500">Auto-skips disputed invoices</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Channels</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">Email + WhatsApp</div>
          <div className="mt-1 text-xs text-gray-500">With 1-click UPI links</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Statutory Backing</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">T+30 / T+45</div>
          <div className="mt-1 text-xs text-gray-500">MSME Act 2006 compliance</div>
        </div>
      </div>

      {/* Dry Run / Live Result Banner */}
      {dryRunResult && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-600 p-2 text-white">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-indigo-900">Simulation Complete (Dry Run)</h3>
                <p className="text-sm text-indigo-700">
                  Evaluated {dryRunResult.evaluatedCount} candidate invoices • {dryRunResult.matchedCount} invoices matched active cadence rules. No live messages were dispatched.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDryRunResult(null)}
              className="text-indigo-400 hover:text-indigo-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {dryRunResult.matches.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-indigo-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Invoice</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Balance</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Triggered Milestone</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Channel</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Recipient</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dryRunResult.matches.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{m.invoiceNumber}</td>
                      <td className="px-3 py-2 text-gray-700">{m.customerName}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{formatINR(m.outstandingAmount)}</td>
                      <td className="px-3 py-2 text-indigo-600 font-medium">{m.ruleName}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            m.channel === "WHATSAPP"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {m.channel === "WHATSAPP" ? (
                            <MessageSquare className="h-3 w-3" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          {m.channel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{m.recipient}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {liveResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-600 p-2 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-emerald-900">Cadence Execution Complete</h3>
                <p className="text-sm text-emerald-700">
                  Dispatched {liveResult.sentCount} automated outreach messages ({liveResult.failedCount} failed) across {liveResult.matchedCount} qualified invoices.
                </p>
              </div>
            </div>
            <button
              onClick={() => setLiveResult(null)}
              className="text-emerald-400 hover:text-emerald-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Cadence Rules List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 font-medium">{error}</p>
          <button
            onClick={fetchWorkflows}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {workflows.map((wf) => (
            <div key={wf.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50/60 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{wf.name}</h2>
                    <p className="text-xs text-gray-500">
                      {wf.description || "Progressive escalation milestones for debt recovery"}
                    </p>
                  </div>
                  {wf.isSystemDefault && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      System Default Cadence
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {wf.rules.map((rule) => {
                  const isPreDue = rule.daysRelative < 0;
                  const isLegalNotice = rule.daysRelative >= 30;

                  return (
                    <div
                      key={rule.id}
                      className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                        rule.enabled ? "bg-white" : "bg-gray-50/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Milestone Badge */}
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                            isPreDue
                              ? "bg-blue-100 text-blue-800"
                              : isLegalNotice
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {rule.daysRelative === 0
                            ? "Due Day"
                            : isPreDue
                            ? `T${rule.daysRelative}d`
                            : `T+${rule.daysRelative}d`}
                        </div>

                        {/* Rule Details */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">{rule.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                rule.channel === "WHATSAPP"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {rule.channel === "WHATSAPP" ? (
                                <MessageSquare className="h-3 w-3" />
                              ) : (
                                <Mail className="h-3 w-3" />
                              )}
                              {rule.channel}
                            </span>
                            {rule.includePaymentLink && (
                              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                                1-Click UPI Link
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span>
                              Min Balance: <strong className="text-gray-700">{formatINR(rule.minAmount || 0)}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Throttle Cooldown: <strong className="text-gray-700">{rule.cooldownHours || 24}h</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Trigger: <strong className="text-gray-700">{rule.triggerType}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Toggle */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleRule(wf.id, rule.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            rule.enabled ? "bg-indigo-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              rule.enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Live Execution */}
      {showConfirmLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                <Play className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Execute Live Cadence Batch</h3>
                <p className="text-xs text-gray-500">Dispatch live notifications to customers</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              This will evaluate all active invoices and immediately dispatch genuine Email & WhatsApp payment reminders (with dynamic settlement links) to customers who match cadence milestones.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmLive(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteLiveBatch}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Cadence Escalation Rule</h3>
                <p className="text-xs text-gray-500">Create a new milestone trigger in your collection sequence</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRuleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Rule Name</label>
                <input
                  type="text"
                  required
                  value={newRule.name || ""}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., 3-Day Overdue Courtesy Ping"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Trigger Type</label>
                  <select
                    value={newRule.triggerType || "OVERDUE"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        triggerType: e.target.value as "DUE_SOON" | "OVERDUE" | "PROMISE_BROKEN" | "HIGH_RISK",
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="OVERDUE">Days Overdue (T+)</option>
                    <option value="DUE_SOON">Days Before Due (T-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Days Relative ({newRule.triggerType === "DUE_SOON" ? "Negative, e.g. -3" : "Positive, e.g. 5"})
                  </label>
                  <input
                    type="number"
                    required
                    value={newRule.daysRelative ?? 3}
                    onChange={(e) => setNewRule({ ...newRule, daysRelative: parseInt(e.target.value, 10) })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Channel</label>
                  <select
                    value={newRule.channel || "EMAIL"}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        channel: e.target.value as "EMAIL" | "WHATSAPP" | "SMS" | "TASK",
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Min Amount (₹)</label>
                  <input
                    type="number"
                    value={newRule.minAmount ?? 500}
                    onChange={(e) => setNewRule({ ...newRule, minAmount: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="linkCheckbox"
                    checked={newRule.includePaymentLink}
                    onChange={(e) => setNewRule({ ...newRule, includePaymentLink: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="linkCheckbox" className="text-xs font-medium text-gray-700">
                    Include 1-Click Dynamic UPI Payment Link
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Cooldown:</label>
                  <select
                    value={newRule.cooldownHours ?? 24}
                    onChange={(e) => setNewRule({ ...newRule, cooldownHours: parseInt(e.target.value, 10) })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours</option>
                    <option value={72}>72 Hours</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? "Saving..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
