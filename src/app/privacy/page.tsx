import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — DuesPilot",
  description:
    "DuesPilot Privacy Policy and data protection commitments under the Digital Personal Data Protection Act 2023.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 font-bold text-xs text-white">
              DP
            </div>
            <span>DuesPilot</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm md:p-12">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Effective Date: September 4, 2026 · Version 2.0
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                1. Overview & Scope
              </h2>
              <p className="mt-2">
                DuesPilot (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides a multi-tenant B2B accounts
                receivable and collections operating system for businesses in India. This
                Privacy Policy outlines our commitments regarding the collection, storage,
                processing, and deletion of business contact information and accounts
                receivable data in compliance with the Digital Personal Data Protection
                (DPDP) Act 2023.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                2. Information We Collect
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-gray-900">Account Credentials:</strong> Name,
                  business email address, encrypted password hash (bcrypt cost 12), and
                  company name provided during registration.
                </li>
                <li>
                  <strong className="text-gray-900">Receivables & Customer Data:</strong> Customer
                  names, GSTINs, phone numbers, email addresses, invoice numbers, amounts,
                  due dates, and payment history imported by authorized organization users.
                </li>
                <li>
                  <strong className="text-gray-900">Operational Records:</strong> Interaction
                  notes, payment promises, dispute records, and collection event logs created
                  by organization users.
                </li>
                <li>
                  <strong className="text-gray-900">Audit & Security Logs:</strong> IP
                  addresses, timestamps, request IDs, and mutation action types recorded in
                  tenant-scoped audit logs for security and compliance.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                3. Purpose of Processing & Data Minimization
              </h2>
              <p className="mt-2">
                We process receivables and contact data solely to deliver collection queue
                prioritization, automated status tracking, payment reconciliation, and
                analytics. We do not sell, rent, or trade your debtor contact information to
                third parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                4. Multi-Tenant Data Isolation & Security
              </h2>
              <p className="mt-2">
                Every organization operates in strict logical isolation. All queries and
                mutations are scoped by a unique tenant identifier (&quot;Organization ID&quot;) at the
                application layer. Data transmission is secured using TLS 1.3, and access
                tokens are handled via HTTP-only SameSite session cookies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                5. User Rights: Data Export & Account Deletion
              </h2>
              <p className="mt-2">
                In alignment with DPDP Act principles, organization owners have direct
                self-service capabilities:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-gray-900">Right to Portability (Data Export):</strong> Full
                  export of all organization tables in CSV or JSON format via the Settings
                  dashboard at any time.
                </li>
                <li>
                  <strong className="text-gray-900">Right to Erasure (Account Deletion):</strong> Organization
                  owners can execute a complete data purge via the Danger Zone in Settings,
                  which cascades deletion across all customers, invoices, payments,
                  promises, events, preferences, and member records.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                6. Contact & Grievance Officer
              </h2>
              <p className="mt-2">
                For privacy inquiries or grievance redressal under the DPDP Act, contact:
                <br />
                <span className="font-medium text-gray-900">
                  Data Protection Officer / Grievance Redressal
                </span>
                <br />
                Email: <span className="text-blue-600">privacy@duespilot.example.com</span>
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-6">
            <Link
              href="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
