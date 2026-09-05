import Link from "next/link";

export const metadata = {
  title: "Terms of Service — DuesPilot",
  description:
    "Terms of Service for DuesPilot B2B Collections Operating System.",
};

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Effective Date: September 4, 2026 · Version 2.0
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                1. Acceptance of Terms
              </h2>
              <p className="mt-2">
                By creating an account or accessing the DuesPilot platform, your organization
                agrees to these Terms of Service. If you are accepting on behalf of an
                employer or entity, you represent that you have full authority to bind that
                organization.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                2. Nature of Service: B2B Operational Tool
              </h2>
              <p className="mt-2">
                DuesPilot is a software application designed to assist Indian B2B SMEs in
                organizing, prioritizing, and managing their accounts receivable workflows.
                <strong className="text-gray-900"> DuesPilot is not a collection agency, law firm, payment gateway, or accounting system.</strong> We do not hold customer funds, process card payments directly, or provide legal representation.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                3. User Responsibilities & Data Legality
              </h2>
              <p className="mt-2">
                Your organization is solely responsible for:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  Ensuring all customer contact details and invoice records imported into
                  the platform are legally obtained and accurate.
                </li>
                <li>
                  Ensuring all communications dispatched to debtors comply with relevant
                  telecom, Do Not Disturb (DND), and fair-debt collection practices.
                </li>
                <li>
                  Maintaining the confidentiality of user account credentials and managing
                  role-based access within your team.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                4. MSMED Act & Interest Calculation Disclaimer
              </h2>
              <p className="mt-2">
                Any calculation of delayed payment interest or references to the Micro,
                Small and Medium Enterprises Development (MSMED) Act 2006 provided by the
                service is for informational and operational assistance only. Organizations
                must consult qualified legal or accounting counsel before initiating formal
                claims on MSME Samadhaan or legal proceedings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                5. Service Availability & Limitation of Liability
              </h2>
              <p className="mt-2">
                DuesPilot provides the service on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. In no
                event shall DuesPilot be liable for indirect, incidental, punitive, or
                consequential damages, including lost profits or unrecovered debt amounts.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                6. Termination & Data Portability
              </h2>
              <p className="mt-2">
                Organization owners may terminate their account at any time via the Settings
                panel. Upon account deletion, all organizational records are permanently
                purged from our active database. You are encouraged to utilize the data
                export feature prior to account closure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">
                7. Governing Law & Jurisdiction
              </h2>
              <p className="mt-2">
                These Terms shall be governed by and construed in accordance with the laws of
                India. Any dispute arising out of or related to these Terms shall be subject
                to the exclusive jurisdiction of the courts in India.
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
