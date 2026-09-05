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
      { name: "Communications", href: "/dashboard/communications", icon: Send },
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
      <aside className="hidden lg:flex lg:flex-col lg:w-60 border-r border-gray-100 bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
              <span className="text-white font-bold text-[11px]">DP</span>
            </div>
            <span className="text-lg font-bold text-gray-900">DuesPilot</span>
          </div>
          <NotificationBell />
        </div>

        {/* Global Search Quick Trigger */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 rounded-xl border border-gray-200 transition"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <span>Search…</span>
            </div>
            <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-400">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
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
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-semibold text-xs">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
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
