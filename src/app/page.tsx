import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">DP</span>
            </div>
            <span className="text-xl font-bold text-gray-900">DuesPilot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 border border-green-200">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Built for Indian B2B businesses
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight">
            Stop chasing overdue
            <br />
            invoices manually.
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl">
            Connect your existing accounts data. DuesPilot tells you who to
            contact, what to say, when to follow up, and what happened next —
            from first reminder to payment.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Import my receivables
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-bold text-gray-900">₹55,244 Cr</p>
              <p className="mt-1 text-sm text-gray-600">
                Delayed payment claims on MSME Samadhaan
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">2,56,892</p>
              <p className="mt-1 text-sm text-gray-600">
                Delayed-payment applications filed
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">9.45 Cr</p>
              <p className="mt-1 text-sm text-gray-600">
                Udyam registrations in India
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Collection Queue Preview */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
          Your daily command center
        </p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">
          Today&apos;s Collection Queue
        </h2>
        <p className="mt-3 text-gray-600 max-w-xl">
          No more aging reports. DuesPilot tells you exactly who to contact,
          what happened last time, and what to do next.
        </p>

        <div className="mt-10 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>
                <strong className="text-gray-900">₹18.4L</strong> overdue
              </span>
              <span>
                <strong className="text-gray-900">37</strong> customers overdue
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Row 1 */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                  <span className="text-red-700 font-bold text-xs">RS</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Raj Steel</p>
                  <p className="text-sm text-gray-500">
                    ₹4.8L · 21 days overdue · Promise broken
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">
                CALL NOW
              </span>
            </div>
            {/* Row 2 */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-xs">AE</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">ABC Engineering</p>
                  <p className="text-sm text-gray-500">
                    ₹2.2L · 9 days overdue · Low risk
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700">
                WHATSAPP
              </span>
            </div>
            {/* Row 3 */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                  <span className="text-yellow-700 font-bold text-xs">MC</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Metro Components</p>
                  <p className="text-sm text-gray-500">
                    ₹1.7L · 4 days overdue · Auto reminder sent
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700">
                AUTO REMINDER
              </span>
            </div>
            {/* Row 4 */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-xs">DS</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Delta Systems</p>
                  <p className="text-sm text-gray-500">
                    ₹3.1L · 42 days overdue · Dispute: PO mismatch
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700">
                RESOLVE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            From uploaded receivables to collected cash
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900">Upload receivables</h3>
              <p className="mt-2 text-sm text-gray-600">
                Export from Tally/Excel/Busy. Upload CSV. DuesPilot imports
                customers, invoices, and due dates in minutes.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900">
                Collection queue is ready
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                DuesPilot prioritizes who needs attention today, drafts messages,
                and prepares your daily action list.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900">
                Automated follow-ups
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Email and WhatsApp reminders. Promise-to-pay tracking. Broken
                promise escalation. Payment matching.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-3xl font-bold text-gray-900">Built for the job</h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Promise-to-pay tracking",
              desc: "Extract promises from WhatsApp replies. Track who kept and who broke their word.",
            },
            {
              title: "Customer payment behavior",
              desc: "Learn which customers pay late, which dispute often, and which keep promises.",
            },
            {
              title: "Automated communication",
              desc: "Email and WhatsApp follow-ups with customer-specific policies and tone control.",
            },
            {
              title: "Collection timeline",
              desc: "One chronological view of every interaction, message, promise, dispute, and payment.",
            },
            {
              title: "Dispute management",
              desc: "Track reasons: PO mismatch, GRN missing, quantity dispute. Resolve, don't just chase.",
            },
            {
              title: "Payment reconciliation",
              desc: "Match incoming payments to invoices. Handle partial payments, deductions, and credit notes.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow"
            >
              <h3 className="font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Start recovering cash faster
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "₹999",
                desc: "For small businesses",
                features: [
                  "500 active invoices",
                  "2 users",
                  "Email automation",
                  "Basic WhatsApp",
                  "Aging dashboard",
                  "Promise tracking",
                ],
                cta: "Start free trial",
                highlighted: false,
              },
              {
                name: "Growth",
                price: "₹2,499",
                desc: "For growing B2B companies",
                features: [
                  "2,500 active invoices",
                  "5 users",
                  "Full WhatsApp automation",
                  "Payment links",
                  "Escalation workflows",
                  "Customer risk scoring",
                  "Advanced reporting",
                ],
                cta: "Start free trial",
                highlighted: true,
              },
              {
                name: "Pro",
                price: "₹5,999",
                desc: "For larger SMEs",
                features: [
                  "10,000 invoices",
                  "15 users",
                  "Advanced automation",
                  "Multi-business units",
                  "Approval workflows",
                  "Forecasting",
                  "API access",
                ],
                cta: "Start free trial",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${
                  plan.highlighted
                    ? "border-blue-600 bg-white shadow-md ring-1 ring-blue-600"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.highlighted && (
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                    Recommended
                  </p>
                )}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.desc}</p>
                <p className="mt-4 text-3xl font-bold text-gray-900">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-500">
                    /month
                  </span>
                </p>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <svg
                        className="h-4 w-4 text-blue-600 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-2xl bg-blue-600 px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">
            Ready to stop chasing invoices?
          </h2>
          <p className="mt-2 text-blue-100">
            Upload your receivables. See where your cash is stuck.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Import my receivables
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">DP</span>
            </div>
            <span>© 2026 DuesPilot</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
