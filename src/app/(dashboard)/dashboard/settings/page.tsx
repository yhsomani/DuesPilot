"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { api, apiPatch, ApiError } from "@/lib/api";
import type { OrganizationSettings } from "@/lib/types";
import { BillingTab } from "@/components/settings/billing-tab";
import { AuditTab } from "@/components/settings/audit-tab";

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
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
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
          email: inviteEmail,
          name: inviteName || undefined,
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
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
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
          name,
          gstin,
          industry,
          city,
          businessHoursStart: parseTime(businessHoursStart),
          businessHoursEnd: parseTime(businessHoursEnd),
          workingDays: workingDays.length > 0 ? [...workingDays].sort() : null,
          holidays,
          automationsPaused,
        }
      );
      setSettings(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
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
      setError(e instanceof ApiError ? e.message : "Deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500 py-6">Loading settings…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & Administration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage organization configurations, team access, subscription tiers, and compliance audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white p-1 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab("general")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "general"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          General & Hours
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "team"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Team & Access ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "billing"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Billing & Plans
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "audit"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Audit & Compliance Log
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            onClick={() => setRetryKey((n) => n + 1)}
            className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {/* Tab 1: General */}
      {activeTab === "general" && (
        <div className="space-y-6 max-w-2xl">
          {/* Organization */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="font-semibold text-gray-900 mb-4">Organization Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">Select industry</option>
                  <option>Manufacturing</option>
                  <option>Distribution</option>
                  <option>Wholesale</option>
                  <option>IT Services</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Automation */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="font-semibold text-gray-900 mb-1">Collections Schedule & Working Hours</h2>
            <p className="text-sm text-gray-500 mb-4">
              Business hours, working days, and holidays used by scheduled collection automations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Business hours start
                </label>
                <input
                  type="time"
                  value={businessHoursStart}
                  onChange={(e) => setBusinessHoursStart(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Business hours end
                </label>
                <input
                  type="time"
                  value={businessHoursEnd}
                  onChange={(e) => setBusinessHoursEnd(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Working days
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  [1, "Mon"],
                  [2, "Tue"],
                  [3, "Wed"],
                  [4, "Thu"],
                  [5, "Fri"],
                  [6, "Sat"],
                  [7, "Sun"],
                ].map(([day, label]) => (
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
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      workingDays.includes(day as number)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Holidays (one ISO date per line, e.g. 2026-01-26)
              </label>
              <textarea
                value={holidaysText}
                onChange={(e) => setHolidaysText(e.target.value)}
                rows={3}
                placeholder="2026-01-26"
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Pause automations</p>
                <p className="text-xs text-gray-500">
                  Temporarily stop scheduled collection actions organization-wide.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={automationsPaused}
                onClick={() => setAutomationsPaused((p) => !p)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  automationsPaused ? "bg-red-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                    automationsPaused ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Preferences */}
          {prefs && prefs.available && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
              <h2 className="font-semibold text-gray-900 mb-1">Collections Preferences</h2>
              <p className="text-sm text-gray-500 mb-4">
                Personal collection and notification defaults.
              </p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.showBrokenPromiseBanner}
                    disabled={prefsSaving}
                    onChange={(e) =>
                      togglePref("showBrokenPromiseBanner", e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Show broken promise banner
                    </p>
                    <p className="text-xs text-gray-500">
                      Surface broken promise warnings at the top of the collection queue.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.showQueueWhy}
                    disabled={prefsSaving}
                    onChange={(e) => togglePref("showQueueWhy", e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Show priority reason</p>
                    <p className="text-xs text-gray-500">
                      Display the explanation of why each account was prioritized in the queue.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.emailDailyDigest}
                    disabled={prefsSaving}
                    onChange={(e) => togglePref("emailDailyDigest", e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Daily email digest</p>
                    <p className="text-xs text-gray-500">
                      Receive a daily morning summary of today&apos;s prioritized actions.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span className="text-sm font-semibold text-green-600">Saved successfully!</span>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
            <h2 className="font-semibold text-red-900 mb-1">Danger Zone</h2>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete this organization and all customer, invoice, and payment data.
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-red-800">
                Type <strong>delete my organization</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="delete my organization"
                className="block w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-hidden"
              />
              <button
                onClick={handleDelete}
                disabled={deleting || confirmDelete !== "delete my organization"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {deleting ? "Deleting…" : "Permanently Delete Organization"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Team */}
      {activeTab === "team" && (
        <div className="space-y-6 max-w-4xl">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="font-semibold text-gray-900 mb-1">Invite Team Member</h2>
            <p className="text-sm text-gray-500 mb-4">
              Add collectors, finance managers, or administrators to your workspace.
            </p>
            {teamMessage && (
              <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100">
                {teamMessage}
              </div>
            )}
            {teamError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-100">
                {teamError}
              </div>
            )}
            {inviteResult && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-xs text-green-800 border border-green-200 space-y-1">
                <p className="font-semibold">Temporary Credentials Generated:</p>
                <p>Email: <code className="font-mono font-bold">{inviteResult.email}</code></p>
                <p>Password: <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-green-300">{inviteResult.tempPassword}</code></p>
              </div>
            )}
            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
              />
              <input
                type="email"
                required
                placeholder="Work Email *"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
              >
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition"
              >
                Send Invite
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            <table className="min-w-full text-xs divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Member</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Joined</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/75">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{m.name || m.email}</p>
                      <p className="text-[11px] text-gray-400">{m.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role}
                        onChange={(e) => handleChangeRole(m.id, e.target.value)}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700"
                      >
                        {TEAM_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveMember(m.id, m.email)}
                        className="font-medium text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
