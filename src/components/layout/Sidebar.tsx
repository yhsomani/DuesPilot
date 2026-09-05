"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearchModal } from "@/components/layout/GlobalSearchModal";
import {
  LayoutGrid,
  List,
  Users,
  FileText,
  CreditCard,
  Clock,
  AlertTriangle,
  Upload,
  Send,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Workflow,
  CheckCircle2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

const navigation = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      { name: "Collection Queue", href: "/dashboard/queue", icon: List },
    ],
  },
  {
    label: "Manage",
    items: [
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
      { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
      { name: "Promises", href: "/dashboard/promises", icon: Clock },
      { name: "Disputes", href: "/dashboard/disputes", icon: AlertTriangle },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "Import", href: "/dashboard/import", icon: Upload },
      { name: "Reconciliation", href: "/dashboard/reconciliation", icon: CheckCircle2 },
      { name: "Communications", href: "/dashboard/communications", icon: Send },
      { name: "Workflows", href: "/dashboard/workflows", icon: Workflow },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user;
  const displayName = user?.name || "User";
  const email = user?.email || "";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  // Shortcut key listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <span className="font-bold text-xs">DP</span>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight leading-none block">DuesPilot</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Collections OS</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <span className="font-bold text-xs">DP</span>
                </div>
                <div>
                  <span className="text-base font-bold text-slate-900 tracking-tight leading-none block">DuesPilot</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Collections OS</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick search button */}
            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 rounded-xl border border-slate-200 transition"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <span>Search across tenant…</span>
                </div>
                <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-500 font-semibold shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {navigation.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon: LucideIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-700 shadow-2xs border border-blue-100/60"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User Account & Logout */}
            <div className="border-t border-slate-100 p-3 bg-slate-50/50">
              <div className="flex items-center gap-3 rounded-xl p-2 bg-white border border-slate-200/80 shadow-2xs">
                <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {initials || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors border border-transparent hover:border-rose-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-slate-200/80 bg-white shadow-2xs select-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <span className="font-bold text-xs">DP</span>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight leading-none block">DuesPilot</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Collections OS</span>
            </div>
          </Link>
          <NotificationBell />
        </div>

        {/* Global Search Quick Trigger */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 rounded-xl border border-slate-200/90 transition shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Search…</span>
            </div>
            <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-500 font-semibold shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon: LucideIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-2xs border border-blue-100/80"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Account Footer */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5 rounded-xl p-2 bg-white border border-slate-200/80 shadow-2xs mb-2">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
              {initials || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors border border-transparent"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Global Command Menu Dialog */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
