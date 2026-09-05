"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  PhoneCall,
  Send,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const reset = searchParams.get("reset");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Please provide both email and password.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email address or password. Please try again.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Column: Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 bg-white border-r border-slate-200/80">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo Header */}
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <span className="font-bold text-sm">DP</span>
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">DuesPilot</span>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Collections OS
              </span>
            </div>
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-xs text-slate-500">
              Sign in to manage your collection queue and recover receivables.
            </p>
          </div>

          {registered && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Account registered successfully. Please sign in.</span>
            </div>
          )}

          {reset && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Password reset successful. Please sign in with your new password.</span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3" role="alert">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full h-10 text-xs font-semibold shadow-xs"
            >
              Sign In to Dashboard
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Sign up for free
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Session</span>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Product Showcase */}
      <div className="hidden lg:flex flex-1 bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.08),rgba(248,250,252,0))]" />

        <div className="max-w-md w-full relative z-10 space-y-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Live Queue Preview
                </span>
              </div>
              <Badge variant="destructive" size="sm">₹18.4L Overdue</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-200/80">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    RS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Raj Steel</p>
                    <p className="text-[11px] text-slate-500">₹4.8L · 21d overdue</p>
                  </div>
                </div>
                <Badge variant="destructive" size="sm" className="gap-1">
                  <PhoneCall className="h-3 w-3" />
                  CALL NOW
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-200/80">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    AE
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">ABC Engineering</p>
                    <p className="text-[11px] text-slate-500">₹2.2L · 9d overdue</p>
                  </div>
                </div>
                <Badge variant="warning" size="sm" className="gap-1">
                  <Send className="h-3 w-3" />
                  WHATSAPP
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 border border-blue-200/80">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    MC
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Metro Components</p>
                    <p className="text-[11px] text-slate-500">₹1.7L · 4d overdue</p>
                  </div>
                </div>
                <Badge variant="blue" size="sm">
                  AUTO DUNNING
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-200/50 text-xs text-blue-900 leading-relaxed">
            <strong>MSME Compliant:</strong> Calculate Section 15 statutory compound penal interest at 3x RBI rate and recover dues faster.
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
