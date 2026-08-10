import ExcelJS from "exceljs";
import type { CourseRow } from "@/lib/data/courses.repository";

function getCategory(course: CourseRow): string {
  return course.category?.trim() || "Otros";
}

const BRAND_COLOR  = "4F46E5"; // indigo-600
const HEADER_COLOR = "EEF2FF"; // indigo-50
const CAT_COLOR    = "6366F1"; // indigo-500
const ALT_ROW      = "F8F9FF";

export async function exportCoursesExcel(courses: CourseRow[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Esmera School Manager";
  wb.created = new Date();

  const ws = wb.addWorksheet("Catálogo de Cursos", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
    views: [{ showGridLines: false }],
  });

  // Column widths
  ws.columns = [
    { key: "name",   width: 50 },
    { key: "code",   width: 15 },
    { key: "hours",  width: 12 },
    { key: "price",  width: 14 },
    { key: "status", width: 12 },
  ];

  // ── Title row ──────────────────────────────────────────────
  ws.mergeCells("A1:E1");
  const title = ws.getCell("A1");
  title.value = "CATÁLOGO DE CURSOS — ESMERA SCHOOL";
  title.font  = { name: "Calibri", bold: true, size: 16, color: { argb: "FF" + BRAND_COLOR } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // ── Subtitle (date) ────────────────────────────────────────
  ws.mergeCells("A2:E2");
  const sub = ws.getCell("A2");
  sub.value = `Generado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`;
  sub.font  = { name: "Calibri", size: 10, color: { argb: "FF6B7280" } };
  sub.alignment = { horizontal: "center" };
  ws.getRow(2).height = 18;

  ws.addRow([]); // spacer

  // ── Column headers ─────────────────────────────────────────
  const headerRow = ws.addRow(["Curso", "Código", "Horas", "Precio", "Estado"]);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font      = { name: "Calibri", bold: true, size: 11, color: { argb: "FF" + BRAND_COLOR } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + HEADER_COLOR } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border    = { bottom: { style: "medium", color: { argb: "FF" + BRAND_COLOR } } };
  });
  headerRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  // ── Group courses by category ──────────────────────────────
  const PREFERRED_ORDER = ["Cejas y Pestañas", "Uñas", "Micropigmentación", "Marketing Digital"];
  const allCats = [...new Set(courses.map(getCategory))];
  const categoryOrder = [
    ...PREFERRED_ORDER.filter((c) => allCats.includes(c)),
    ...allCats.filter((c) => !PREFERRED_ORDER.includes(c)),
  ];

  const grouped = new Map<string, CourseRow[]>();
  for (const cat of categoryOrder) grouped.set(cat, []);
  for (const c of courses) {
    const cat = getCategory(c);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(c);
  }

  let rowIdx = 0;
  for (const cat of categoryOrder) {
    const items = grouped.get(cat) ?? [];
    if (!items.length) continue;

    // Category header
    const catRow = ws.addRow([cat.toUpperCase(), "", "", "", ""]);
    ws.mergeCells(`A${catRow.number}:E${catRow.number}`);
    catRow.height = 20;
    const catCell = catRow.getCell(1);
    catCell.value = cat.toUpperCase();
    catCell.font  = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    catCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + CAT_COLOR } };
    catCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

    // Data rows
    for (const course of items) {
      const isAlt = rowIdx % 2 === 1;
      const r = ws.addRow([
        course.name,
        course.code ?? "—",
        course.duration_hours != null ? `${course.duration_hours} h` : "—",
        course.price != null ? `${Number(course.price).toLocaleString("es-ES")} €` : "—",
        course.is_active ? "Activo" : "Inactivo",
      ]);
      r.height = 18;
      r.eachCell((cell, col) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isAlt ? "FF" + ALT_ROW : "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "center" };
        cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } };
      });
      // Price bold
      r.getCell(4).font = { name: "Calibri", size: 10, bold: true };
      // Status color
      const statusCell = r.getCell(5);
      statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: course.is_active ? "FF059669" : "FF6B7280" } };
      rowIdx++;
    }
  }

  // ── Footer ─────────────────────────────────────────────────
  ws.addRow([]);
  const footerRow = ws.addRow([`Total: ${courses.length} cursos`, "", "", "", ""]);
  ws.mergeCells(`A${footerRow.number}:E${footerRow.number}`);
  footerRow.getCell(1).font      = { name: "Calibri", bold: true, size: 10, color: { argb: "FF" + BRAND_COLOR } };
  footerRow.getCell(1).alignment = { horizontal: "right" };

  // ── Download ───────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = `catalogo-cursos-esmera-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
