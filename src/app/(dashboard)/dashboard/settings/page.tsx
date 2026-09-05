"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { api, apiPatch, ApiError } from "@/lib/api";
import type { OrganizationSettings } from "@/lib/types";
import { BillingTab } from "@/components/settings/billing-tab";
import { AuditTab } from "@/components/settings/audit-tab";
import {
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Check,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: string | null;
  createdAt: string;
};

const TEAM_ROLES = [
  "OWNER",
  "ADMIN",
  "FINANCE_MANAGER",
  "COLLECTOR",
  "SALES",
  "VIEWER",
] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "team" | "billing" | "audit">("general");
  const [_settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [businessHoursStart, setBusinessHoursStart] = useState("");
  const [businessHoursEnd, setBusinessHoursEnd] = useState("");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [holidaysText, setHolidaysText] = useState("");
  const [automationsPaused, setAutomationsPaused] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [prefs, setPrefs] = useState<{
    showBrokenPromiseBanner: boolean;
    showQueueWhy: boolean;
    emailDailyDigest: boolean;
    available: boolean;
  } | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("COLLECTOR");
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const loadTeam = async () => {
    try {
      const team = await api<TeamMember[]>("/api/team");
      setMembers(team);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    let active = true;
    api<TeamMember[]>("/api/team")
      .then((m) => {
        if (active) setMembers(m);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);
    setTeamMessage(null);
    setInviteResult(null);
    try {
      const res = await api<{
        id: string;
        name: string | null;
        email: string;
        role: string;
        tempPassword: string;
      }>(`/api/team`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          role: inviteRole,
        }),
      });
      setInviteEmail("");
      setInviteName("");
      setInviteResult({ email: res.email, tempPassword: res.tempPassword });
      setTeamMessage(
        `Invited ${res.email}. Share the temporary password with them — it will not be shown again.`
      );
      await loadTeam();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Invite failed");
    }
  };

  const handleChangeRole = async (id: string, role: string) => {
    setTeamError(null);
    setTeamMessage(null);
    try {
      await apiPatch<{ role: string }, unknown>(`/api/team/${id}`, { role });
      await loadTeam();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const handleRemoveMember = async (id: string, email: string) => {
    if (!window.confirm(`Remove ${email} from this organization?`)) return;
    setTeamError(null);
    setTeamMessage(null);
    try {
      await api(`/api/team/${id}`, { method: "DELETE" });
      setTeamMessage(`Removed ${email}.`);
      await loadTeam();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Failed to remove member");
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<OrganizationSettings>("/api/settings");
        if (!active) return;
        setSettings(data);
        setName(data.name);
        setGstin(data.gstin ?? "");
        setIndustry(data.industry ?? "");
        setCity(data.city ?? "");
        const toTime = (m: number | null) =>
          m == null
            ? ""
            : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        setBusinessHoursStart(toTime(data.businessHoursStart));
        setBusinessHoursEnd(toTime(data.businessHoursEnd));
        setWorkingDays(data.workingDays ?? [1, 2, 3, 4, 5]);
        setHolidaysText((data.holidays ?? []).join("\n"));
        setAutomationsPaused(data.automationsPaused);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [retryKey]);

  useEffect(() => {
    let active = true;
    api<{
      showBrokenPromiseBanner: boolean;
      showQueueWhy: boolean;
      emailDailyDigest: boolean;
      available: boolean;
    }>("/api/notifications/preferences")
      .then((p) => {
        if (active) setPrefs(p);
      })
      .catch(() => {
        if (active) setPrefs(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const togglePref = async (
    key: "showBrokenPromiseBanner" | "showQueueWhy" | "emailDailyDigest",
    value: boolean
  ) => {
    if (!prefs) return;
    setPrefsSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<
        Record<string, boolean>,
        {
          showBrokenPromiseBanner: boolean;
          showQueueWhy: boolean;
          emailDailyDigest: boolean;
          available: boolean;
        }
      >("/api/notifications/preferences", { [key]: value });
      setPrefs(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const parseTime = (t: string): number | null => {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
    };
    const holidays = holidaysText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    try {
      const updated = await apiPatch<Partial<OrganizationSettings>, OrganizationSettings>(
        "/api/settings",
        {
          name: name.trim(),
          gstin: gstin.trim() || null,
          industry: industry || null,
          city: city.trim() || null,
          businessHoursStart: parseTime(businessHoursStart),
          businessHoursEnd: parseTime(businessHoursEnd),
          workingDays: workingDays.length > 0 ? [...workingDays].sort() : null,
          holidays,
          automationsPaused,
        }
      );
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save organization settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api(`/api/account`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: confirmDelete }),
      });
      await signOut({ callbackUrl: "/login" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Account deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-12 w-full bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-96 w-full bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Settings & Workspace Administration
            </h1>
            <Badge variant="blue" size="sm">
              Tenant Control Plane
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage organization configurations, team access, subscription tiers, and compliance audit logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "general"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>General & Hours</span>
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "team"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Team & Access</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeTab === "team" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {members.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "billing"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Billing & Plans</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "audit"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Audit & Compliance Log</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-2xs"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Settings Action Error</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
            <button
              onClick={() => setRetryKey((n) => n + 1)}
              className="mt-2 text-xs font-semibold text-rose-900 underline hover:text-rose-950"
            >
              Try reloading
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: General & Hours */}
      {activeTab === "general" && (
        <div className="space-y-6 max-w-3xl">
          {/* Organization Details */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Organization Profile</h2>
                <p className="text-xs text-slate-500">
                  Legal entity name, GSTIN, and operational jurisdiction
                </p>
              </div>
              <Badge variant="blue" size="sm">
                Primary Identity
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (India)</label>
                <input
                  type="text"
                  placeholder="27AABCU9603R1ZM"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Industry Sector</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  <option value="">Select industry</option>
                  <option value="Manufacturing">Manufacturing & Engineering</option>
                  <option value="Distribution">Wholesale & Distribution</option>
                  <option value="IT Services">IT, SaaS & Software Services</option>
                  <option value="Logistics">Supply Chain & Logistics</option>
                  <option value="Consulting">Professional Consulting & Legal</option>
                  <option value="Other">Other Enterprise Sector</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operating City</label>
                <input
                  type="text"
                  placeholder="Mumbai, Bangalore, Delhi..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Collections Schedule & Working Hours */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Dunning Window & Working Schedule
                </h2>
                <p className="text-xs text-slate-500">
                  Defines permissible hours and working days for automated communication dispatch
                </p>
              </div>
              <Badge variant="purple" size="sm">
                TRAI / DND Compliant
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Hours Start (IST)
                </label>
                <input
                  type="time"
                  value={businessHoursStart}
                  onChange={(e) => setBusinessHoursStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Hours End (IST)
                </label>
                <input
                  type="time"
                  value={businessHoursEnd}
                  onChange={(e) => setBusinessHoursEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Active Working Days
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  [1, "Monday"],
                  [2, "Tuesday"],
                  [3, "Wednesday"],
                  [4, "Thursday"],
                  [5, "Friday"],
                  [6, "Saturday"],
                  [7, "Sunday"],
                ].map(([day, label]) => {
                  const isSelected = workingDays.includes(day as number);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setWorkingDays((prev) =>
                          prev.includes(day as number)
                            ? prev.filter((d) => d !== day)
                            : [...prev, day as number]
                        )
                      }
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Calendar Holidays (One ISO date per line: YYYY-MM-DD)
              </label>
              <textarea
                value={holidaysText}
                onChange={(e) => setHolidaysText(e.target.value)}
                rows={3}
                placeholder="2026-01-26&#10;2026-08-15&#10;2026-10-02"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <div>
                <p className="text-xs font-bold text-slate-900">Pause All Dunning Automations</p>
                <p className="text-[11px] text-slate-500">
                  Emergency switch: halts scheduled WhatsApp, Email, and SMS reminders organization-wide.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={automationsPaused}
                onClick={() => setAutomationsPaused((p) => !p)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  automationsPaused ? "bg-rose-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-2xs transition-all ${
                    automationsPaused ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Preferences */}
          {prefs && prefs.available && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Collector Workspace Preferences</h2>
                  <p className="text-xs text-slate-500">
                    Personalized visual cues and notification defaults
                  </p>
                </div>
                <Badge variant="default" size="sm">
                  Personal
                </Badge>
              </div>

              <div className="space-y-3.5">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl hover:bg-slate-50/70 border border-transparent hover:border-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={prefs.showBrokenPromiseBanner}
                    disabled={prefsSaving}
                    onChange={(e) => togglePref("showBrokenPromiseBanner", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Show Broken Promise Warning Banner</p>
                    <p className="text-[11px] text-slate-500">
                      Prominently highlight delinquent PTP accounts at the top of the collection queue.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl hover:bg-slate-50/70 border border-transparent hover:border-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={prefs.showQueueWhy}
                    disabled={prefsSaving}
                    onChange={(e) => togglePref("showQueueWhy", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Show AI / Algorithmic Priority Reason</p>
                    <p className="text-[11px] text-slate-500">
                      Display rule-based justification badges for queue rankings (e.g. Broken PTP, &gt;90d Aging).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl hover:bg-slate-50/70 border border-transparent hover:border-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={prefs.emailDailyDigest}
                    disabled={prefsSaving}
                    onChange={(e) => togglePref("emailDailyDigest", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Daily Morning Briefing Email</p>
                    <p className="text-[11px] text-slate-500">
                      Receive an executive summary of pending promises, high-exposure debtors, and disputes at 08:30 AM IST.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              loading={saving}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Workspace Settings</span>
            </Button>
            {saved && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>Saved successfully!</span>
              </span>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-900 mb-1">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <h2 className="font-bold text-sm">Danger Zone — Organization Teardown</h2>
            </div>
            <p className="text-xs text-rose-700 mb-4">
              Permanently delete this organization, customers, invoices, communication logs, and payment records. This action cannot be undone.
            </p>
            <div className="space-y-3 max-w-md">
              <label className="block text-[11px] font-bold text-rose-900">
                Type <strong>delete my organization</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="delete my organization"
                className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                loading={deleting}
                disabled={deleting || confirmDelete !== "delete my organization"}
                className="gap-1.5 text-xs font-bold shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Permanently Delete Organization</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Team & Access */}
      {activeTab === "team" && (
        <div className="space-y-6 max-w-4xl">
          {/* Invite Member Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Invite Team Member</h2>
                <p className="text-xs text-slate-500">
                  Provision accounts for credit controllers, collectors, sales reps, or executives.
                </p>
              </div>
              <Badge variant="blue" size="sm">
                RBAC Access
              </Badge>
            </div>

            {teamMessage && (
              <div className="my-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>{teamMessage}</span>
              </div>
            )}

            {teamError && (
              <div className="my-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{teamError}</span>
              </div>
            )}

            {inviteResult && (
              <div className="my-3 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-900 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Temporary Credentials Generated
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `Email: ${inviteResult.email}\nPassword: ${inviteResult.tempPassword}`
                      )
                    }
                    className="h-7 px-2 text-[11px] gap-1 text-emerald-800 border-emerald-300 bg-white hover:bg-emerald-100"
                  >
                    {copiedPass ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPass ? "Copied" : "Copy Credentials"}</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 block">Login Email</span>
                    <span className="font-bold">{inviteResult.email}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 block">Temp Password</span>
                    <span className="font-bold text-emerald-700">{inviteResult.tempPassword}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleInvite} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Full Name (e.g. Ramesh Kumar)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <input
                type="email"
                required
                placeholder="Work Email *"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Send Invite</span>
              </Button>
            </form>
          </div>

          {/* Members Table */}
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Active Workspace Team Members</h2>
                <p className="text-xs text-slate-500">
                  Manage permissions, role assignments, and member access.
                </p>
              </div>
              <Badge variant="blue" size="sm">
                {members.length} Total Users
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-600">Member</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-600">Role</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-600">Joined On</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {members.map((m) => {
                    const initials = (m.name || m.email)
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{m.name || "Team Member"}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.id, e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none"
                          >
                            {TEAM_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap font-medium">
                          {new Date(m.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(m.id, m.email)}
                            className="h-7 px-2 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            <span>Remove</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Billing & Plans */}
      {activeTab === "billing" && <BillingTab />}

      {/* Tab 4: Audit Log */}
      {activeTab === "audit" && <AuditTab />}
    </div>
  );
}
