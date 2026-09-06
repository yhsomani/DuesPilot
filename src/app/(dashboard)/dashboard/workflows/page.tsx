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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";

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
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Automated Dunning Cadences
            </h1>
            <Badge variant="success" size="sm">
              Active Engine
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure multi-channel automated collection workflows, time-relative milestones, and statutory MSME escalation steps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDryRun}
            disabled={dryRunLoading}
            className="gap-1.5"
          >
            <Play className={cn("h-4 w-4 text-blue-600", dryRunLoading && "animate-spin")} strokeWidth={1.5} />
            <span>Test Run (Dry Run)</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setLiveModalOpen(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4" strokeWidth={1.5} />
            <span>Execute Cadence Batch</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setAddRuleModalOpen(true)}
            className="gap-1.5 bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Add Rule</span>
          </Button>
        </div>
      </div>

      {/* Security & Guard KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Cadence Plan"
          value="MSME 45-Day"
          subtitle="Standard statutory schedule"
          icon={Workflow}
          variant="blue"
        />
        <StatCard
          title="Dispute & Promise Guard"
          value="100% Guarded"
          subtitle="Zero dunning to disputed accounts"
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard
          title="Outreach Throttle"
          value="24h Cooldown"
          subtitle="Maximum 1 automated touch / 24 hrs"
          icon={Clock}
          variant="purple"
        />
      </div>

      {/* Live Run Completion Banner */}
      {liveRunResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-900 flex items-start gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-green-900">Cadence Execution Complete</h4>
            <p className="text-xs text-green-700 mt-0.5">
              Evaluated {liveRunResult.evaluatedCount} invoices and dispatched {liveRunResult.sentCount} automated outreach messages across tenant debtors.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLiveRunResult(null)}
            className="text-green-700 hover:text-green-900 p-1"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Dry Run Simulation Result */}
      {dryRunResult && (
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 text-blue-900 space-y-3 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600 shrink-0" strokeWidth={1.5} />
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
              className="text-blue-700 hover:text-blue-900 p-1"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {dryRunResult.matches && dryRunResult.matches.length > 0 && (
            <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Invoice #</th>
                      <th className="px-3.5 py-2.5">Customer</th>
                      <th className="px-3.5 py-2.5">Outstanding</th>
                      <th className="px-3.5 py-2.5">Triggered Rule</th>
                      <th className="px-3.5 py-2.5">Channel</th>
                      <th className="px-3.5 py-2.5">Recipient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dryRunResult.matches.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition">
                        <td className="px-3.5 py-2.5 font-bold font-mono text-gray-900">{m.invoiceNumber}</td>
                        <td className="px-3.5 py-2.5 font-medium text-gray-700">{m.customerName}</td>
                        <td className="px-3.5 py-2.5 font-semibold font-mono text-gray-900">
                          ₹{m.outstandingAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3.5 py-2.5 text-blue-700 font-medium">{m.ruleName}</td>
                        <td className="px-3.5 py-2.5">
                          <Badge
                            variant={m.channel === "WHATSAPP" ? "success" : "blue"}
                            size="sm"
                          >
                            {m.channel}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-gray-500 font-mono text-[11px]">
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Configured Cadence Rules</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Rules execute automatically in sequential priority order when invoices cross relative aging milestones.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4 text-gray-500", loading && "animate-spin")} strokeWidth={1.5} />
          </Button>
        </div>

        <div className="divide-y divide-gray-100">
          {activeRules.map((rule, idx) => (
            <div
              key={rule.id || idx}
              className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 transition"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                    rule.channel === "WHATSAPP"
                      ? "bg-green-50 text-green-600 border-green-200"
                      : "bg-blue-50 text-blue-600 border-blue-200"
                  )}
                >
                  {rule.channel === "WHATSAPP" ? (
                    <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Mail className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-gray-900">{rule.name}</h4>
                    <Badge
                      variant={rule.triggerType === "DUE_SOON" ? "warning" : "danger"}
                      size="sm"
                    >
                      {rule.daysRelative < 0
                        ? `T${rule.daysRelative} Days (Pre-Due)`
                        : `T+${rule.daysRelative} Days (Overdue)`}
                    </Badge>
                    {rule.includePaymentLink && (
                      <Badge variant="neutral" size="sm">
                        Dynamic Payment Link
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Channel: <span className="font-semibold text-gray-700">{rule.channel}</span> · Minimum:{" "}
                    <span className="font-semibold text-gray-700 font-mono">₹{rule.minAmount || 500}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <Badge variant={rule.enabled ? "success" : "neutral"} size="sm">
                  {rule.enabled ? "Active" : "Paused"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Cadence Batch Confirmation Modal */}
      {liveModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900">
                <Send className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                <h3 className="text-base font-bold">Execute Live Cadence Batch</h3>
              </div>
              <button
                type="button"
                onClick={() => setLiveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              This will evaluate all active customer invoices across your organization against the 45-day cadence rules and dispatch live Email and WhatsApp outreach with dynamic payment links.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>Invoices with active disputes or unexpired promises to pay are safely bypassed.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLiveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteLive}
                loading={liveRunning}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <span>Confirm & Dispatch</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Escalation Rule Modal */}
      {addRuleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-gray-900">
                <Plus className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                <h3 className="text-base font-bold">Add Cadence Escalation Rule</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddRuleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="3-Day Overdue Courtesy Ping"
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Trigger Type *
                  </label>
                  <select
                    value={newRule.triggerType}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        triggerType: e.target.value as "DUE_SOON" | "OVERDUE" | "PROMISE_BROKEN" | "HIGH_RISK",
                      })
                    }
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  >
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="DUE_SOON">DUE_SOON</option>
                    <option value="PROMISE_BROKEN">PROMISE_BROKEN</option>
                    <option value="HIGH_RISK">HIGH_RISK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Channel *
                  </label>
                  <select
                    value={newRule.channel}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        channel: e.target.value as "WHATSAPP" | "EMAIL" | "SMS",
                      })
                    }
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  >
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Days Relative *
                  </label>
                  <input
                    type="number"
                    value={newRule.daysRelative}
                    onChange={(e) =>
                      setNewRule({ ...newRule, daysRelative: Number(e.target.value) })
                    }
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Min Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={newRule.minAmount}
                    onChange={(e) =>
                      setNewRule({ ...newRule, minAmount: Number(e.target.value) })
                    }
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs font-mono"
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
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="incPlink" className="text-xs font-medium text-gray-700">
                  Include Dynamic UPI & NetBanking payment link
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddRuleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={submittingRule}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
