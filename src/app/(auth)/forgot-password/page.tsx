"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json()) as { error?: string; devResetUrl?: string };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
      } else {
        setDone(true);
        setDevResetUrl(body.devResetUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <span className="font-bold text-base">DP</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">DuesPilot</span>
          </Link>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset password</h1>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Enter your work email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl">
          {error && (
            <div className="mb-5 flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3" role="alert">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {done ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 mb-0.5">Reset link generated</p>
                  <p className="text-slate-600 leading-relaxed">
                    If an account exists for <strong>{email}</strong>, a password reset link has been created.
                  </p>
                </div>
              </div>

              {devResetUrl && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Development Reset Link:</p>
                  <Link
                    href={devResetUrl}
                    className="font-mono text-[11px] text-blue-600 hover:text-blue-700 underline break-all"
                  >
                    Open Password Reset Form →
                  </Link>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  setDone(false);
                  setEmail("");
                }}
              >
                Send to another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full h-10 text-xs font-semibold shadow-xs"
              >
                Send Reset Link
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
