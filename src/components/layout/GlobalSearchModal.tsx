"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import type { SearchResultItem } from "@/app/api/search/route";
import { Search, Building2, FileText, Clock, AlertTriangle, ArrowRight, CornerDownLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  query: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  initialQuery = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (initialQuery) {
          setQuery(initialQuery);
        }
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let ignore = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api<SearchResponse>(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );
        if (!ignore) {
          setResults(res.results);
          setSelectedIndex(0);
        }
      } catch {
        if (!ignore) {
          setResults([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  const activeResults = query.trim().length >= 2 ? results : [];

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (activeResults.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + activeResults.length) % (activeResults.length || 1));
    } else if (e.key === "Enter" && activeResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(activeResults[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    onClose();
  };

  const handleSelect = (item: SearchResultItem) => {
    handleClose();
    router.push(item.url);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in-20 duration-150"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3 bg-white">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, GSTIN, invoice #, promises, disputes…"
            className="w-full text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          {loading && (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 border border-slate-200 bg-slate-50 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length >= 2 && activeResults.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-slate-500">
              <p className="font-bold text-slate-800 text-sm">No matching records found</p>
              <p className="text-slate-400 mt-1 max-w-xs mx-auto">
                Try searching with a customer name, GST number, or invoice identifier.
              </p>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 px-4 text-xs text-slate-400 text-center space-y-3">
              <p className="font-semibold text-slate-600 text-xs">Quick Search Navigation</p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/60 font-medium">Customer name</span>
                <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/60 font-medium">GSTIN</span>
                <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/60 font-medium">INV-XXXX</span>
                <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/60 font-medium">Notes</span>
              </div>
            </div>
          )}

          {activeResults.length > 0 && (
            <div className="space-y-1">
              {activeResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                let IconComponent = Building2;
                let badgeVariant: "blue" | "success" | "purple" | "warning" = "blue";

                if (item.type === "invoice") {
                  IconComponent = FileText;
                  badgeVariant = "success";
                } else if (item.type === "promise") {
                  IconComponent = Clock;
                  badgeVariant = "purple";
                } else if (item.type === "dispute") {
                  IconComponent = AlertTriangle;
                  badgeVariant = "warning";
                }

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 shadow-2xs"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border shrink-0 ${
                          isSelected ? "bg-white border-blue-200 text-blue-600" : "bg-slate-50 border-slate-200/80 text-slate-500"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs font-bold truncate ${
                              isSelected ? "text-blue-950" : "text-slate-900"
                            }`}
                          >
                            {item.title}
                          </p>
                          <Badge variant={badgeVariant} size="sm">
                            {item.type}
                          </Badge>
                          {item.badge && (
                            <Badge variant="neutral" size="sm">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-3">
                      {item.amount !== undefined && (
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900 font-mono">
                            {formatINR(item.amount)}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">Outstanding</span>
                        </div>
                      )}
                      <ArrowRight className={`h-4 w-4 ${isSelected ? "text-blue-600" : "text-slate-300"}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500">
          <span>Search across your tenant database</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] font-semibold">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] font-semibold">↓</kbd>
              <span className="ml-0.5">Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] font-semibold flex items-center">
                <CornerDownLeft className="h-2.5 w-2.5" />
              </kbd>
              <span>Select</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
