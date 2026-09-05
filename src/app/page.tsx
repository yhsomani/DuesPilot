"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
  PhoneCall,
  Send,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"queue" | "workflows" | "msme" | "payment">("queue");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-4 py-2 text-center text-xs font-medium text-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-400/30">
            MSMED Act 2006 Compliant
          </span>
          <span>Claim statutory 3x RBI compound penal interest on B2B dues overdue past 45 days.</span>
          <Link href="/register" className="font-semibold text-blue-300 underline hover:text-white ml-1">
            Calculate your claims &rarr;
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <span className="font-bold text-sm tracking-tight">DP</span>
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">DuesPilot</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Collections OS
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#interactive-preview" className="hover:text-blue-600 transition-colors">Live Demo</a>
            <a href="#msme-law" className="hover:text-blue-600 transition-colors">MSME Law</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign in
            </Link>
            <Link href="/register">
              <Button size="sm" className="shadow-xs">
                Start Free Trial
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.12),rgba(255,255,255,0))]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60 shadow-2xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Autonomous Receivables Recovery for Indian B2B Enterprises</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] max-w-4xl mx-auto">
            Stop chasing overdue B2B invoices manually.{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Recover cash on autopilot.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            DuesPilot integrates with Tally, Excel & ERPs to prioritize your daily collection queue, trigger multi-channel WhatsApp/Email dunning cadences, enforce Section 15 MSMED penal interest, and collect with 1-click UPI payment links.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-sm px-6 h-12 shadow-sm font-semibold">
                Import My Receivables (Free)
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="#interactive-preview" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-sm px-6 h-12 bg-white/80">
                Explore Live Interactive Demo
              </Button>
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>AES-256 Envelope Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              <span>Section 15 & 16 MSMED Act</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>1-Click NPCI UPI Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>Official WhatsApp Business API</span>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Impact KPIs */}
      <section className="border-y border-slate-200/80 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="pt-4 md:pt-0">
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-tabular">14.2 Days</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Average DSO Reduction</p>
            </div>
            <div className="pt-4 md:pt-0">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-tabular">20.25% p.a.</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">3x RBI MSME Compound Interest</p>
            </div>
            <div className="pt-4 md:pt-0">
              <p className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-tabular">78.4%</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Promise-to-Pay Adherence</p>
            </div>
            <div className="pt-4 md:pt-0">
              <p className="text-3xl sm:text-4xl font-extrabold text-purple-600 font-tabular">3.8x</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collector Productivity Lift</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Demo Showcase */}
      <section id="interactive-preview" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="default" size="sm" className="mb-3">
              Live Product Experience
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              An intelligent command center built for recovery teams
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Toggle between core workflows to see how DuesPilot turns messy aging reports into deterministic collection actions.
            </p>

            {/* Interactive Tab Selectors */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl max-w-2xl mx-auto border border-slate-300/60">
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "queue"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Daily Collection Queue
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("workflows")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "workflows"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Dunning Cadences
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("msme")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "msme"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                MSME 3x Interest
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payment")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "payment"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                UPI & Payment Links
              </button>
            </div>
          </div>

          {/* Active Tab Preview Display */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl">
            {activeTab === "queue" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Today&apos;s Priority Collection Actions</h3>
                    <p className="text-xs text-slate-500">4 items requiring immediate outreach based on risk scoring and promise deadlines</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      ₹18,40,000 Overdue Today
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-rose-200/80 bg-rose-50/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                        RS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Raj Steel Fabrications</span>
                          <Badge variant="destructive" size="sm">CRITICAL (Risk 82)</Badge>
                          <Badge variant="warning" size="sm">Broken Promise</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">₹4,80,000 overdue · 21 days past due · Promised date Aug 28 missed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="destructive" className="gap-1.5">
                        <PhoneCall className="h-3.5 w-3.5" />
                        Call Owner
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Send className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-200/80 bg-amber-50/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                        AE
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">ABC Precision Engineering</span>
                          <Badge variant="warning" size="sm">HIGH (Risk 58)</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">₹2,20,000 overdue · 9 days past due · Cadence milestone T+7 triggered</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="primary" className="gap-1.5">
                        <Send className="h-3.5 w-3.5" />
                        Send Reminder
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-purple-200/80 bg-purple-50/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                        DS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Delta Automation Systems</span>
                          <Badge variant="purple" size="sm">DISPUTE PENDING</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">₹3,10,000 · 42 days overdue · Reason: Purchase order price discrepancy</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5 text-purple-700 border-purple-200">
                        Resolve Dispute
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "workflows" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Autonomous Dunning Cadences</h3>
                    <p className="text-xs text-slate-500">Deterministic escalation rules triggered based on invoice aging milestones</p>
                  </div>
                  <Badge variant="success" size="sm">Active Engine</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-700">T-3 DAYS</span>
                      <Badge variant="blue" size="sm">Gentle Email</Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Upcoming invoice reminder with breakdown and 1-click payment link.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-800">T+7 DAYS</span>
                      <Badge variant="warning" size="sm">WhatsApp + Email</Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Firm overdue notification with statement of accounts and dynamic UPI QR code.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-rose-700">T+45 DAYS</span>
                      <Badge variant="destructive" size="sm">MSME Statutory Notice</Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Section 15 formal demand letter with calculated 3x RBI compound interest claim.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "msme" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Section 15 & 16 MSMED Act 2006 Penal Interest Engine</h3>
                    <p className="text-xs text-slate-500">Statutory compound monthly interest at 3x the RBI Bank Rate (20.25% p.a.)</p>
                  </div>
                  <Badge variant="purple" size="sm">RBI Rate: 6.75% × 3</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                    <p className="text-xs font-medium text-slate-500">Original Principal Due</p>
                    <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">₹5,00,000</p>
                    <p className="text-[11px] text-slate-500 mt-1">Invoice dated 90 days ago</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50">
                    <p className="text-xs font-medium text-purple-700">Calculated Penal Interest (20.25% p.a.)</p>
                    <p className="text-2xl font-bold text-purple-950 font-tabular mt-1">₹25,684</p>
                    <p className="text-[11px] text-purple-700 mt-1">45 days statutory interest accrued</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
                    <p className="text-xs font-medium text-emerald-700">Total Statutory Legal Claim</p>
                    <p className="text-2xl font-bold text-emerald-950 font-tabular mt-1">₹5,25,684</p>
                    <p className="text-[11px] text-emerald-700 mt-1">Ready for MSME Samadhaan filing</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Dynamic 1-Click Payment Links & Webhook Settlement</h3>
                    <p className="text-xs text-slate-500">Embed UPI deep links, QR codes, and card gateways in every communication</p>
                  </div>
                  <Badge variant="blue" size="sm">Instant FIFO Settlement</Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                  <div className="h-28 w-28 bg-white p-2 rounded-2xl border border-blue-200 shadow-xs flex items-center justify-center shrink-0">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-blue-600">UPI QR CODE</div>
                      <div className="mt-1 text-[9px] text-slate-400 font-mono">upi://pay?pa=...</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <h4 className="text-sm font-bold text-slate-900">Zero-Friction Buyer Settlement Flow</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Buyers can pay via GPay, PhonePe, Paytm, or NetBanking directly from WhatsApp or email. Real-time webhooks reconcile invoices in seconds and automatically mark active promises as KEPT.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="success" size="sm">Razorpay</Badge>
                      <Badge variant="blue" size="sm">Cashfree</Badge>
                      <Badge variant="secondary" size="sm">NPCI UPI</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Value Grid */}
      <section id="features" className="py-20 bg-white border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="purple" size="sm" className="mb-3">
              Comprehensive Capabilities
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Everything your collections team needs in one platform
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "Promise-to-Pay Engine",
                desc: "Schedule multi-installment settlement plans, track adherence, and automatically detect broken promises.",
                badge: "Core Feature",
              },
              {
                icon: Scale,
                title: "MSME Statutory Legal Claims",
                desc: "Calculate Section 15 & 16 compound penal interest at 3x RBI rate and auto-generate legal demand notices.",
                badge: "Statutory Law",
              },
              {
                icon: Zap,
                title: "Automated Dunning Cadences",
                desc: "Multi-tier milestone triggers across Email & WhatsApp with tone calibration and dispute protection.",
                badge: "Autonomous",
              },
              {
                icon: FileText,
                title: "Smart CSV Import Wizard",
                desc: "Effortlessly import customer ledgers and invoices from Tally, Busy, or Excel with auto-column mapping.",
                badge: "Easy Onboarding",
              },
              {
                icon: AlertTriangle,
                title: "Root-Cause Dispute Resolution",
                desc: "Categorize PO mismatches, missing GRNs, and quality claims. Track resolution without delaying overall aging.",
                badge: "Dispute Hub",
              },
              {
                icon: TrendingUp,
                title: "DSO & Cohort Analytics",
                desc: "Real-time visibility into Days Sales Outstanding, Collection Effectiveness Index (CEI), and collector speed.",
                badge: "Executive KPIs",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="hover:border-blue-300 hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {f.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="default" size="sm" className="mb-3">
              Transparent Pricing
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Simple, predictable plans for growing businesses
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Recover thousands of rupees in overdue invoices for a fraction of the collection cost.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="mt-6 inline-flex items-center gap-3 p-1 bg-slate-200/80 rounded-xl border border-slate-300/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  billingCycle === "monthly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  billingCycle === "annual" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: billingCycle === "annual" ? "₹799" : "₹999",
                desc: "Ideal for small B2B suppliers and traders",
                features: [
                  "Up to 500 active invoices",
                  "2 team seats",
                  "Automated Email dunning",
                  "Promise-to-pay tracking",
                  "CSV ledger import wizard",
                  "Standard aging dashboard",
                ],
                highlight: false,
                cta: "Start 14-Day Free Trial",
              },
              {
                name: "Growth",
                price: billingCycle === "annual" ? "₹1,999" : "₹2,499",
                desc: "For scaling manufacturers and distributors",
                features: [
                  "Up to 2,500 active invoices",
                  "5 team seats",
                  "Full WhatsApp + Email cadences",
                  "Dynamic UPI payment links",
                  "Section 15 MSME interest engine",
                  "Multi-installment payment plans",
                  "Real-time webhook auto-settlement",
                ],
                highlight: true,
                cta: "Start 14-Day Free Trial",
              },
              {
                name: "Pro",
                price: billingCycle === "annual" ? "₹4,799" : "₹5,999",
                desc: "For large enterprise finance departments",
                features: [
                  "Up to 10,000 active invoices",
                  "15 team seats",
                  "Custom dunning cadence rules",
                  "Formal statutory notice generator",
                  "Executive DSO & CEI forecasting",
                  "Organization audit trails & RBAC",
                  "Priority support & onboarding",
                ],
                highlight: false,
                cta: "Start 14-Day Free Trial",
              },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col justify-between ${
                  plan.highlight
                    ? "border-blue-600 shadow-xl ring-2 ring-blue-600 bg-white"
                    : "border-slate-200/80 bg-white"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 font-tabular">{plan.price}</span>
                    <span className="text-xs font-semibold text-slate-500">/ month</span>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-xs text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <div className="p-8 pt-0">
                  <Link href="/register">
                    <Button
                      variant={plan.highlight ? "primary" : "outline"}
                      className="w-full text-xs font-semibold h-10 shadow-xs"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to unlock cash stuck in overdue accounts?
          </h2>
          <p className="mt-3 text-sm text-blue-100 max-w-xl mx-auto">
            Join thousands of Indian businesses accelerating cash flow with DuesPilot. Setup takes under 5 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 shadow-md">
                Import Your Receivables Now
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="lg" className="text-white hover:bg-white/10">
                Sign In to Existing Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-[10px]">
              DP
            </div>
            <span className="font-bold text-slate-900">DuesPilot</span>
            <span>&copy; {new Date().getFullYear()} DuesPilot Inc. Built for Indian B2B Commerce.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <a href="mailto:support@duespilot.example.com" className="hover:text-slate-900 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
