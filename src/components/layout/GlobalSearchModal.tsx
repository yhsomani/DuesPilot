"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import type { SearchResultItem } from "@/app/api/search/route";

interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  query: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api<SearchResponse>(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        setResults(res.results);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (results.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    router.push(item.url);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/50 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100 gap-3">
          <svg
            className="w-5 h-5 text-gray-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, invoices, promises, disputes… (Esc to close)"
            className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden bg-transparent"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            onClick={onClose}
            className="rounded-md px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="py-12 text-center text-sm text-gray-500">
              <p className="font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching by customer name, GSTIN, invoice number, or notes.
              </p>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 px-4 text-xs text-gray-400 text-center space-y-2">
              <p className="font-medium text-gray-500">Quick Navigation Tips</p>
              <div className="flex justify-center gap-4 text-[11px]">
                <span>Type <strong>Cust</strong> for customers</span>
                <span>Type <strong>INV-</strong> for invoices</span>
                <span>Press <strong>↑ / ↓</strong> to navigate</span>
                <span>Press <strong>↵</strong> to select</span>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const typeIcon =
                  item.type === "customer"
                    ? "🏢"
                    : item.type === "invoice"
                    ? "📄"
                    : item.type === "promise"
                    ? "🤝"
                    : "⚠️";

                const typeColor =
                  item.type === "customer"
                    ? "text-blue-700 bg-blue-50 border-blue-200"
                    : item.type === "invoice"
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : item.type === "promise"
                    ? "text-purple-700 bg-purple-50 border-purple-200"
                    : "text-amber-700 bg-amber-50 border-amber-200";

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 shadow-xs"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{typeIcon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-semibold truncate ${
                              isSelected ? "text-blue-900" : "text-gray-900"
                            }`}
                          >
                            {item.title}
                          </p>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${typeColor}`}
                          >
                            {item.type}
                          </span>
                          {item.badge && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {item.amount !== undefined && (
                      <div className="text-right shrink-0 pl-3">
                        <p className="text-xs font-bold text-gray-900">
                          {formatINR(item.amount)}
                        </p>
                        <span className="text-[10px] text-gray-400">Outstanding</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
          <span>Search across your tenant data</span>
          <div className="flex items-center gap-2">
            <span>Navigate with <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px]">↓</kbd></span>
            <span>Select with <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px]">Enter</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
}
