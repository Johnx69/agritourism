// Owner portal — create & manage listings
"use client";
import React from "react";
import Link from "next/link";

export default function OwnerPage() {
  const [name, setName] = React.useState("");
  const [shortIntro, setShortIntro] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [listings, setListings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/listings", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    setListings(d?.listings || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setErr(null);
    setCreating(true);
    const r = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, shortIntro }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setErr(d?.error || "Unable to create listing");
    setCreating(false);
    setName("");
    setShortIntro("");
    load();
  }

  async function submitForReview(id: string) {
    await fetch(`/api/listings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit" }) });
    load();
  }

  return (
    <main className="min-h-screen bg-white relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl p-6 sm:p-10">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Owner · Manage listings</h1>
          <p className="text-sm text-emerald-900/70">Create a listing, update basics, and submit for review.</p>
        </header>

        {err && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-950 px-4 py-3 mb-4 text-sm">{err}</div>}

        <form onSubmit={onCreate} className="rounded-2xl border border-emerald-900/10 bg-white/70 p-4 sm:p-6 shadow-sm grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-emerald-950">Business name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-2 shadow-inner outline-none focus:border-emerald-600/40 focus:ring-1 focus:ring-emerald-600/20" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-emerald-950">Short intro</label>
            <input value={shortIntro} onChange={(e) => setShortIntro(e.target.value)} className="mt-1 w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-2 shadow-inner outline-none" placeholder="What you're known for…" />
          </div>
          <div className="sm:col-span-3">
            <button disabled={creating} className="rounded-xl bg-emerald-600 text-white px-4 py-2 shadow-sm hover:bg-emerald-700">
              {creating ? "Creating…" : "Create listing"}
            </button>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-emerald-900/10">
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-4 text-emerald-900/70" colSpan={4}>Loading…</td></tr>
              ) : listings.length === 0 ? (
                <tr><td className="p-4 text-emerald-900/70" colSpan={4}>No listings yet.</td></tr>
              ) : listings.map((l) => (
                <tr key={l.id} className="border-t border-emerald-900/10">
                  <td className="p-3">{l.name}</td>
                  <td className="p-3">{l.status}</td>
                  <td className="p-3">{l.slug}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => submitForReview(l.id)} className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">Submit</button>
                      <Link href={`/explore/${l.slug}`} className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">Preview</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
