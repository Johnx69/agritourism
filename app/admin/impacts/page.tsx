"use client";

import React from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import HyperFormula from "hyperformula";
import Papa from "papaparse";

import "handsontable/styles/handsontable.min.css";

// Register all built-in plugins (Formulas, Filters, DropdownMenu, ExportFile, etc.)
registerAllModules();

// ---- Small helpers ---------------------------------------------------------
const CATEGORIES = ["General", "Labor", "Equipment", "Fuel", "Seed", "Feed", "Other"] as const;

type Row = [string, string, number | string, number | string, string, string, boolean];

// Create a sensible starting sheet (you can adjust row count)
const INITIAL_ROWS = 50;
function makeInitialData(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < INITIAL_ROWS; i++) {
    const r = i + 1; // A1 notation rows are 1-based
    rows.push([
      `Item ${r}`,                // A: Item
      "General",                  // B: Category
      0,                          // C: Qty
      0,                          // D: Price
      `=C${r}*D${r}`,             // E: Total (formula per row)
      "",                         // F: Notes
      true,                       // G: Active?
    ]);
  }
  return rows;
}

export default function SimulatorSheet() {
  const hotRef = React.useRef<any>(null);
  const [data, setData] = React.useState<Row[]>(makeInitialData());
  const [sum, setSum] = React.useState<number>(0);
  const [csvUrl, setCsvUrl] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (csvUrl) URL.revokeObjectURL(csvUrl);
    };
  }, [csvUrl]);

  // Recompute quick sum of "Total" (col E) after edits
  const recomputeSummary = React.useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    const colE = hot.getDataAtCol(4); // zero-based index 4 => column E
    const s = colE.reduce((acc: number, v: any) => {
      const n = Number(String(v).replace(/[, $]/g, ""));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    setSum(s);
  }, []);

  // CSV export (uses ExportFile plugin for perfect CSVs)
  const exportCsv = React.useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    const exporter = hot.getPlugin("exportFile");
    exporter.downloadFile("csv", {
      columnHeaders: true,
      rowHeaders: false,
      bom: true,
      filename: "simulation-data_[YYYY]-[MM]-[DD]_[HH]-[mm]",
      nullValue: "",
    });
  }, []);

  // CSV import (replaces grid contents)
  const onImportCsv = React.useCallback((file: File) => {
    setImporting(true);
    Papa.parse(file, {
      complete: (res) => {
        // If the file includes a header row matching our columns, strip it.
        // Otherwise treat the file as raw rows in the same order.
        const raw: any[] = res.data as any[];
        const maybeHeader = (raw[0] ?? []).map((x: any) => String(x).toLowerCase().trim());
        const looksLikeHeader =
          maybeHeader.join(",") === "item,category,qty,price,total,notes,active" ||
          maybeHeader.join(",") === "item,category,quantity,price,total,notes,active";

        const rows = (looksLikeHeader ? raw.slice(1) : raw)
          .filter((r) => Array.isArray(r) && r.length)
          .map((r) => {
            const A = String(r[0] ?? "");
            const B = String(r[1] ?? "") || "General";
            const C = r[2] ?? 0;
            const D = r[3] ?? 0;
            const rowIndex = 0; // formula will be rewritten below anyway
            // Recreate a safe per-row formula for Total (E)
            // We’ll rewrite after load with actual row numbers.
            const E = "=C1*D1";
            const F = String(r[5] ?? "");
            const G = String(r[6] ?? "").toLowerCase() !== "false";
            return [A, B, C, D, E, F, G] as Row;
          });

        // Rewrite formulas to match actual A1 rows (1-based)
        const rewritten = rows.map((row, i) => {
          const r = i + 1;
          return [row[0], row[1], row[2], row[3], `=C${r}*D${r}`, row[5], row[6]] as Row;
        });

        setData(rewritten);
        setImporting(false);
        // postpone recompute until grid renders
        setTimeout(recomputeSummary, 50);
      },
      error: () => setImporting(false),
      skipEmptyLines: true,
    });
  }, [recomputeSummary]);

  const onClear = React.useCallback(() => {
    setData(makeInitialData());
    setTimeout(recomputeSummary, 50);
  }, [recomputeSummary]);

  const onAddRows = React.useCallback((count = 100) => {
    const start = data.length;
    const more: Row[] = [];
    for (let i = 0; i < count; i++) {
      const r = start + i + 1;
      more.push([`Item ${r}`, "General", 0, 0, `=C${r}*D${r}`, "", true]);
    }
    setData((d) => [...d, ...more]);
    setTimeout(recomputeSummary, 50);
  }, [data.length, recomputeSummary]);

  // Build modified CSV for quick “Download current data” (alternative to ExportFile)
  const buildCsvBlobUrl = React.useCallback(() => {
    if (csvUrl) URL.revokeObjectURL(csvUrl);
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    // Include headers
    const headers = ["Item", "Category", "Qty", "Price", "Total", "Notes", "Active"];
    // Use "getSourceData" to preserve raw formulas (not just computed values)
    const src = hot.getSourceData() as Row[];
    const csv = Papa.unparse({ fields: headers, data: src });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    setCsvUrl(url);
  }, [csvUrl]);

  // Recompute summary once after first mount
  React.useEffect(() => {
    setTimeout(recomputeSummary, 150);
  }, [recomputeSummary]);

  // UI: hidden file input for import
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <main className="min-h-screen bg-white relative">
      {/* Pretty background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-7xl p-6 sm:p-10">
        <header className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Simulation Sheet (editable like Excel)</h1>
          <p className="text-sm text-emerald-900/70">
            Type, paste from Excel/Sheets, use formulas (e.g. <code>=SUM(E1:E50)</code>), autofill, filter & sort. Perfect for large data entry.
          </p>
        </header>

        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm shadow-sm hover:bg-emerald-50"
          >
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportCsv(f);
              e.currentTarget.value = ""; // reset
            }}
          />

          <button
            onClick={exportCsv}
            className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm shadow-sm hover:bg-emerald-50"
          >
            Export CSV
          </button>

          <button
            onClick={() => onAddRows(100)}
            className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm shadow-sm hover:bg-emerald-50"
          >
            +100 rows
          </button>

          <button
            onClick={onClear}
            className="rounded-xl bg-rose-600 px-3 py-2 text-sm text-white shadow-sm hover:bg-rose-700"
          >
            Clear & Reset
          </button>

          {/* Optional alternate CSV builder that preserves raw formulas */}
          <button
            onClick={buildCsvBlobUrl}
            className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm shadow-sm hover:bg-emerald-50"
          >
            Build CSV (raw formulas)
          </button>
          {csvUrl && (
            <a
              href={csvUrl}
              download="simulation-data.csv"
              className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm shadow-sm hover:bg-emerald-50"
            >
              Download
            </a>
          )}

          <div className="ml-auto flex items-center gap-3 rounded-2xl border border-emerald-900/10 bg-white/70 px-3 py-2 text-sm shadow-sm">
            <span className="text-emerald-900/60">∑ Total (E):</span>
            <span className="font-medium text-emerald-950">
              {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(sum)}
            </span>
          </div>
        </div>

        {/* The spreadsheet */}
        <div className="rounded-2xl border border-emerald-900/10 bg-white/80 shadow-sm overflow-hidden">
          <HotTable
            ref={hotRef}
            data={data}
            // Sheet behavior
            rowHeaders
            colHeaders={["Item", "Category", "Qty", "Price", "Total", "Notes", "Active"]}
            formulas={{ engine: HyperFormula }}
            licenseKey="non-commercial-and-evaluation" /* replace with your license for production */
            width="100%"
            height="70vh"
            stretchH="all"
            // Editing & UX
            contextMenu
            dropdownMenu
            filters
            columnSorting
            manualColumnMove
            manualColumnResize
            manualRowMove
            manualRowResize
            autoWrapRow={false}
            // Performance with big tables
            persistentState
            viewportColumnRenderingOffset={20}
            viewportRowRenderingOffset={20}
            // Column types
            columns={[
              { type: "text" },                                 // A Item
              { type: "dropdown", source: CATEGORIES as any },  // B Category
              { type: "numeric", numericFormat: { pattern: "0,0.[000]" } }, // C Qty
              { type: "numeric", numericFormat: { pattern: "$0,0.00" } },   // D Price
              // E Total = formula cells (leave type implicit so users can enter "=...")
              { },
              { type: "text" },                                 // F Notes
              { type: "checkbox", className: "htCenter" },      // G Active?
            ]}
            // Keep React state in sync only when needed
            afterChange={(changes, source) => {
              if (!changes || source === "loadData") return;
              // Optionally mirror to React state for persistence elsewhere:
              // setData(hotRef.current.hotInstance.getSourceData() as Row[]);
              recomputeSummary();
            }}
            // Visual tweaks for computed/readonly cells (optional)
            cells={(row, col) => {
              const cellProperties: any = {};
              if (col === 4) {
                // Highlight "Total" column
                cellProperties.className = "htRight htBold";
              }
              return cellProperties;
            }}
          />
        </div>

        {/* Tips */}
        <div className="mt-4 text-sm text-emerald-900/70">
          <p className="mb-1">Tips:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use formulas like <code>=SUM(E1:E999)</code>, <code>=AVERAGE(C1:C999)</code>, <code>=C2*D2</code>.</li>
            <li>Copy/paste and autofill work like Excel. Right-click for context menu.</li>
            <li>Filter and sort from the column header dropdowns. Drag headers to resize/reorder.</li>
            <li>Use <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd> for undo/redo.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
