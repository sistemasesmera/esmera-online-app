"use client";

import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, SkipForward, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { importLeads, type ImportLeadRow, type ImportLeadsResult } from "@/app/(app)/crm/leads/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LEAD_SOURCE_LABELS, LEAD_SOURCES } from "@/lib/domain/leads/schema";
import type { LeadSource } from "@/types/database.types";

/* ── helpers ── */
const normalizeStr = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const normalizeHeader = (h: unknown) => normalizeStr(String(h ?? ""));

function resolveSource(raw: string): LeadSource | null {
  const n = normalizeStr(raw);
  if (LEAD_SOURCES.includes(n as LeadSource)) return n as LeadSource;
  const match = (Object.entries(LEAD_SOURCE_LABELS) as [LeadSource, string][]).find(
    ([, label]) => normalizeStr(label) === n
  );
  return match ? match[0] : null;
}

/* ── types ── */
type ParsedRow = ImportLeadRow & { _row: number; _errors: string[] };
type Step = "idle" | "preview" | "result";

/* ══════════════════════════════════════════════════════════════ */
export function ImportLeadsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportLeadsResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const validRows = rows.filter((r) => r._errors.length === 0);
  const errorRows = rows.filter((r) => r._errors.length > 0);

  function reset() {
    setStep("idle");
    setRows([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

    if (!raw.length || raw.length < 2) {
      toast.error("El archivo no contiene datos");
      return;
    }

    const headers = (raw[0] as unknown[]).map(normalizeHeader);
    const colIdx: Partial<Record<"full_name" | "email" | "phone" | "source" | "interested_course", number>> = {};

    headers.forEach((h, i) => {
      if (["nombre", "full_name", "name"].includes(h)) colIdx.full_name = i;
      else if (["email", "correo"].includes(h)) colIdx.email = i;
      else if (["telefono", "phone", "tel", "movil"].includes(h)) colIdx.phone = i;
      else if (["origen", "source"].includes(h)) colIdx.source = i;
      else if (["curso", "formulario", "interested_course"].some((k) => h.includes(k))) colIdx.interested_course = i;
    });

    if (colIdx.full_name === undefined || colIdx.phone === undefined || colIdx.source === undefined) {
      toast.error("Faltan columnas obligatorias: Nombre, Teléfono y Origen");
      return;
    }

    const parsed: ParsedRow[] = (raw.slice(1) as unknown[][])
      .filter((row) => row.some((cell) => String(cell).trim() !== ""))
      .map((row, i) => {
        const errs: string[] = [];
        const full_name = String(row[colIdx.full_name!] ?? "").trim();
        const phone = String(row[colIdx.phone!] ?? "").trim();
        const sourceRaw = String(row[colIdx.source!] ?? "").trim();
        const email = colIdx.email !== undefined ? String(row[colIdx.email] ?? "").trim() : undefined;
        const interested_course =
          colIdx.interested_course !== undefined
            ? String(row[colIdx.interested_course] ?? "").trim()
            : undefined;

        if (!full_name) errs.push("Nombre requerido");
        if (!phone) errs.push("Teléfono requerido");

        const resolved = sourceRaw ? resolveSource(sourceRaw) : null;
        if (!sourceRaw) errs.push("Origen requerido");
        else if (!resolved) errs.push(`Origen "${sourceRaw}" no válido`);

        return {
          _row: i + 2,
          _errors: errs,
          full_name,
          email: email || undefined,
          phone,
          source: resolved ?? sourceRaw,
          interested_course: interested_course || undefined,
        };
      });

    setRows(parsed);
    setStep("preview");
  }

  async function handleDownloadTemplate() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const dataWs = XLSX.utils.aoa_to_sheet([
      ["Nombre", "Email", "Teléfono", "Origen", "Curso / Formulario de interés"],
      ["Juan García", "juan@email.com", "612345678", "organico", "CSS Avanzado"],
      ["María López", "", "634567890", "referido", ""],
    ]);
    dataWs["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, dataWs, "Leads");

    const refRows: [string, string][] = [
      ["Valor (usar en Excel)", "Etiqueta"],
      ...LEAD_SOURCES.map((s): [string, string] => [s, LEAD_SOURCE_LABELS[s]]),
    ];
    const refWs = XLSX.utils.aoa_to_sheet(refRows);
    refWs["!cols"] = [{ wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, refWs, "Orígenes válidos");

    XLSX.writeFile(wb, "plantilla-leads.xlsx");
  }

  function handleImport() {
    if (!validRows.length) return;
    startTransition(async () => {
      const payload: ImportLeadRow[] = validRows.map((row) => ({
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        source: row.source,
        interested_course: row.interested_course,
      }));
      const res = await importLeads(payload);
      setResult(res);
      setStep("result");
      if (res.imported > 0) {
        toast.success(`${res.imported} lead${res.imported !== 1 ? "s" : ""} importado${res.imported !== 1 ? "s" : ""}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            {step === "result" ? "Importación completada" : "Importar leads desde Excel"}
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP: idle ── */}
        {step === "idle" && (
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-semibold mb-2.5">
                El Excel debe tener estas columnas en la primera fila:
              </p>
              <div className="grid grid-cols-5 gap-1.5 text-xs mb-2">
                {(["Nombre *", "Email", "Teléfono *", "Origen *", "Curso / Formulario"] as const).map((col) => (
                  <div
                    key={col}
                    className={`rounded px-2 py-1.5 text-center font-mono ${
                      col.includes("*")
                        ? "bg-primary/10 text-primary font-semibold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {col}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                * Obligatorios. Filas con teléfono duplicado se omiten automáticamente.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">
                Valores válidos para{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Origen</code>:
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {LEAD_SOURCES.map((s) => (
                  <div key={s} className="flex items-center gap-1.5 text-xs rounded border px-2.5 py-1.5 bg-background">
                    <code className="font-mono text-primary/80 shrink-0">{s}</code>
                    <span className="text-muted-foreground">— {LEAD_SOURCE_LABELS[s]}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Puedes usar la clave (<code className="bg-muted px-1 rounded">organico</code>) o la etiqueta (
                <code className="bg-muted px-1 rounded">Orgánico</code>).
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
              <Button size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Upload className="h-4 w-4" />
                Seleccionar archivo…
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {/* ── STEP: preview ── */}
        {step === "preview" && (
          <div className="flex flex-col gap-3 overflow-hidden min-h-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {validRows.length} válidas
              </span>
              {errorRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1 text-xs font-semibold">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorRows.length} con error
                </span>
              )}
              <button
                className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={reset}
              >
                Cambiar archivo
              </button>
            </div>

            <div className="overflow-auto flex-1 rounded-lg border text-xs min-h-0 max-h-[340px]">
              <table className="w-full min-w-[620px]">
                <thead className="bg-muted/60 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                    <th className="px-3 py-2 text-left font-semibold">Teléfono</th>
                    <th className="px-3 py-2 text-left font-semibold">Origen</th>
                    <th className="px-3 py-2 text-left font-semibold">Email</th>
                    <th className="px-3 py-2 text-left font-semibold">Curso</th>
                    <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row._row}
                      className={`border-b last:border-0 ${
                        row._errors.length > 0 ? "bg-red-50/70" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{row._row}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.full_name || <span className="text-red-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {row.phone || <span className="text-red-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {row.source ? (
                          <code className="bg-muted px-1 rounded">{row.source}</code>
                        ) : (
                          <span className="text-red-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.email || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[130px] truncate">
                        {row.interested_course || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row._errors.length > 0 ? (
                          <span className="text-red-600 flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                            {row._errors.join(" · ")}
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                disabled={validRows.length === 0 || isPending}
                onClick={handleImport}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                {isPending
                  ? "Importando…"
                  : `Importar ${validRows.length} lead${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: result ── */}
        {step === "result" && result && (
          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">
                  {result.imported} lead{result.imported !== 1 ? "s" : ""} importado{result.imported !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-emerald-700">Ya aparecen en la lista asignados a ti con estado Nuevo</p>
              </div>
            </div>

            {result.skipped > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <SkipForward className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">
                    {result.skipped} omitido{result.skipped !== 1 ? "s" : ""} por duplicado
                  </p>
                  <p className="text-xs text-amber-700">El teléfono ya existía como lead o alumno</p>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">
                    {result.errors.length} error{result.errors.length !== 1 ? "es" : ""}
                  </p>
                  <ul className="text-xs text-red-700 mt-1 space-y-0.5">
                    {result.errors.map((e) => (
                      <li key={e.row}>
                        Fila {e.row}: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
