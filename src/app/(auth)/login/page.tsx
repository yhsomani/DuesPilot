"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">DP</span>
            </div>
            <span className="text-xl font-bold text-gray-900">DuesPilot</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600">
            Log in to your collections dashboard.
          </p>

          {registered && (
            <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Account created successfully. Please sign in.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
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

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Image/Illustration */}
      <div className="hidden lg:flex flex-1 bg-gray-50 items-center justify-center border-l border-gray-100">
        <div className="max-w-md px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-3">
              Today&apos;s Collection Queue
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Raj Steel
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹4.8L · 21 days overdue
                  </p>
                </div>
                <span className="text-xs font-bold text-red-600">
                  CALL NOW
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-orange-50 border border-orange-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    ABC Engineering
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹2.2L · 9 days overdue
                  </p>
                </div>
                <span className="text-xs font-bold text-orange-600">
                  WHATSAPP
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Metro Components
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹1.7L · 4 days overdue
                  </p>
                </div>
                <span className="text-xs font-bold text-green-600">
                  REMINDER
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
