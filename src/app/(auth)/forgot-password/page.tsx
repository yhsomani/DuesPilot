"use client";

import { useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen flex bg-white">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">DP</span>
            </div>
            <span className="text-xl font-bold text-gray-900">DuesPilot</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your account email and we&apos;ll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="you@company.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {done && (
              <div className="text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <p className="text-green-800">
                  If an account exists for that email, a reset link has been
                  created.
                </p>
                {devResetUrl && (
                  <p className="mt-2 text-green-700">
                    <span className="font-medium">Dev reset link:</span>{" "}
                    <Link href={devResetUrl} className="font-mono underline break-all">
                      open reset form
                    </Link>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              ← Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}