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
      {/* Mobile Top Navigation Header - 64px height */}
      <header className="lg:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-md px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <span className="font-bold text-sm tracking-tight">DP</span>
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 tracking-tight leading-none block">DuesPilot</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider leading-none mt-0.5 block">Collections OS</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
            aria-label="Search"
          >
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex w-full max-w-[280px] flex-1 flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <span className="font-bold text-sm tracking-tight">DP</span>
                </div>
                <div>
                  <span className="text-base font-bold text-gray-900 tracking-tight leading-none block">DuesPilot</span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider leading-none mt-0.5 block">Collections OS</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
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
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-800 rounded-lg border border-gray-200 transition"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                  <span>Search across tenant…</span>
                </div>
                <kbd className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 font-semibold shadow-xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {navigation.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
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
                            "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-700 border-l-[3px] border-l-blue-600 font-semibold"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600" : "text-gray-500")} strokeWidth={1.5} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User Account & Logout */}
            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <div className="flex items-center gap-3 rounded-lg p-2.5 bg-white border border-gray-200 shadow-sm">
                <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {initials || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent hover:border-red-200"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar - 240px Width */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] shrink-0 border-r border-gray-200 bg-white shadow-sm select-none">
        <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition-colors">
              <span className="font-bold text-sm tracking-tight">DP</span>
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 tracking-tight leading-none block">DuesPilot</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider leading-none mt-0.5 block">Collections OS</span>
            </div>
          </Link>
          <NotificationBell />
        </div>

        {/* Global Search Quick Trigger */}
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-800 rounded-lg border border-gray-200 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <span>Search…</span>
            </div>
            <kbd className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 font-semibold shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
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
                        "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-blue-50 text-blue-700 border-l-[3px] border-l-blue-600 font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600" : "text-gray-500")} strokeWidth={1.5} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Account Footer */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="flex items-center gap-2.5 rounded-lg p-2 bg-white border border-gray-200 shadow-sm mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
              {initials || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">{email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors border border-transparent"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
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
