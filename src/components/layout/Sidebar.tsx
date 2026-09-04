"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 border-r border-gray-100 bg-white">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-[11px]">DP</span>
        </div>
        <span className="text-lg font-bold text-gray-900">DuesPilot</span>
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
                        ? "bg-blue-50 text-blue-700"
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
            <span className="text-blue-700 font-semibold text-xs">YS</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Yash</p>
            <p className="text-xs text-gray-500 truncate">yash@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
