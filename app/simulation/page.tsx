"use client";

import React from "react";

type Row = { name: string; tons: number; cost: number; total: number };
type Payload = { columns: string[]; rows: Row[] };

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

/** Recompute every row’s total and the final Total row */
function recomputeAll(nextRows: Row[]): Row[] {
  const body = nextRows.filter((r) => r.name !== "Total");
  const computed = body.map((r) => ({ ...r, total: r.tons * r.cost }));
  const sums = computed.reduce(
    (acc, r) => {
      acc.tons += r.tons;
      acc.cost += r.cost;
      acc.total += r.total;
      return acc;
    },
    { tons: 0, cost: 0, total: 0 }
  );
  return [...computed, { name: "Total", ...sums }];
}

export default function SimulationPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Load from API
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch("/api/simulation/data", { cache: "no-store" });
        const d: Payload = await r.json();
        if (!r.ok) throw new Error((d as any)?.error || "Failed to load");
        // Make sure totals are consistent
        setRows(recomputeAll(d.rows));
      } catch (e: any) {
        setErr(e?.message || "Unable to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- Editing helpers -----------------------------------------------------

  function updateName(idx: number, value: string) {
    if (idx === rows.length - 1) return; // Total row not editable
    setRows((prev) => {
      const draft = prev.map((r, i) => (i === idx ? { ...r, name: value } : r));
      return recomputeAll(draft);
    });
  }

  function updateNumber(idx: number, field: "tons" | "cost", value: string) {
    if (idx === rows.length - 1) return; // Total row not editable
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    setRows((prev) => {
      const draft = prev.map((r, i) => (i === idx ? { ...r, [field]: safe } as Row : r));
      return recomputeAll(draft);
    });
  }

  function addRow() {
    setRows((prev) => {
      const body = prev.filter((r) => r.name !== "Total");
      const newIndex = body.length + 1;
      const newRow: Row = { name: `item-${newIndex}`, tons: 0, cost: 0, total: 0 };
      return recomputeAll([...body, newRow]);
    });
  }

  function deleteRow(idx: number) {
    if (idx === rows.length - 1) return; // don’t delete Total row
    setRows((prev) => {
      const body = prev.filter((_, i) => i !== idx && prev[i].name !== "Total");
      return recomputeAll(body);
    });
  }

  // ---- Save to disk (API) --------------------------------------------------

  async function onSave() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const payload: Payload = { columns: ["name", "tons", "cost", "total"], rows };
      const r = await fetch("/api/simulation/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Save failed");
      setMsg(`Saved: ${d?.saved?.latest} & ${d?.saved?.snapshot}`);
      setRows(recomputeAll(d.data.rows));
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <main className="min-h-screen bg-white relative">
      {/* decor */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-5xl p-6 sm:p-10">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Simple Simulation Table</h1>
            <p className="text-sm text-emerald-900/70">
              Edit <strong>name</strong>, <strong>tons</strong>, and <strong>cost</strong>. Row totals and the final <em>Total</em> update automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addRow}
              disabled={loading}
              className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2 text-sm shadow-sm hover:bg-emerald-50 disabled:opacity-60"
            >
              + Add row
            </button>
            <button
              onClick={onSave}
              disabled={saving || loading || rows.length === 0}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Submit & Save JSON"}
            </button>
          </div>
        </header>

        {err && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 mb-4 text-sm text-rose-950">{err}</div>}
        {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 mb-4 text-sm text-emerald-900">{msg}</div>}

        <div className="rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white sticky top-0 z-10">
              <tr className="text-left border-b border-emerald-900/10">
                <th className="p-3">Name</th>
                <th className="p-3">Tons</th>
                <th className="p-3">Cost</th>
                <th className="p-3">Total</th>
                <th className="p-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-4 text-emerald-900/70" colSpan={5}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="p-4 text-emerald-900/70" colSpan={5}>No data.</td></tr>
              ) : rows.map((r, i) => {
                const isTotal = i === rows.length - 1 && r.name === "Total";
                return (
                  <tr key={i} className={`border-t border-emerald-900/10 ${isTotal ? "bg-emerald-50/50 font-medium" : ""}`}>
                    <td className="p-3">
                      {isTotal ? (
                        <span>Total</span>
                      ) : (
                        <input
                          type="text"
                          value={r.name}
                          onChange={(e) => updateName(i, e.target.value)}
                          className="w-40 rounded-lg border border-emerald-900/20 bg-white px-2 py-1 shadow-inner outline-none focus:border-emerald-600/40"
                        />
                      )}
                    </td>
                    <td className="p-3">
                      {isTotal ? fmt(r.tons) : (
                        <input
                          inputMode="decimal"
                          type="number"
                          step="any"
                          value={r.tons}
                          onChange={(e) => updateNumber(i, "tons", e.target.value)}
                          className="w-28 rounded-lg border border-emerald-900/20 bg-white px-2 py-1 shadow-inner outline-none focus:border-emerald-600/40"
                        />
                      )}
                    </td>
                    <td className="p-3">
                      {isTotal ? fmt(r.cost) : (
                        <input
                          inputMode="decimal"
                          type="number"
                          step="any"
                          value={r.cost}
                          onChange={(e) => updateNumber(i, "cost", e.target.value)}
                          className="w-28 rounded-lg border border-emerald-900/20 bg-white px-2 py-1 shadow-inner outline-none focus:border-emerald-600/40"
                        />
                      )}
                    </td>
                    <td className="p-3">{fmt(r.total)}</td>
                    <td className="p-3">
                      {isTotal ? (
                        <span className="text-emerald-900/40">—</span>
                      ) : (
                        <button
                          onClick={() => deleteRow(i)}
                          className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50"
                          title="Delete row"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
