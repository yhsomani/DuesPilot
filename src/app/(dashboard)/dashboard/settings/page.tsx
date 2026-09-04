"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Account and organization settings</p>
      </div>

      {/* Organization */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Organization</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company name</label>
            <input type="text" defaultValue="Acme Pvt Ltd" className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">GSTIN</label>
            <input type="text" defaultValue="27AABCA1234A1Z5" className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Industry</label>
            <select className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>Manufacturing</option>
              <option>Distribution</option>
              <option>Wholesale</option>
              <option>IT Services</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "Overdue invoice alerts", desc: "Get notified when invoices become overdue" },
            { label: "Broken promise alerts", desc: "Get notified when customers break payment promises" },
            { label: "Payment received", desc: "Get notified when payments are received" },
            { label: "Daily summary", desc: "Receive a daily collection queue summary" },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{n.label}</p>
                <p className="text-xs text-gray-500">{n.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Data */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Data</h2>
        <div className="space-y-3">
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Export all data
          </button>
          <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Delete account
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Save changes
        </button>
      </div>
    </div>
  );
}
