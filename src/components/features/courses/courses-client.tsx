"use client";

import { Download, Plus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";

import { getCourseColumns } from "@/components/features/courses/course-columns";
import { CourseForm } from "@/components/features/courses/course-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourseRow } from "@/lib/data/courses.repository";

type ActiveFilter = "active" | "inactive" | "all";

const FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "active",   label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "all",      label: "Todos" },
];

export function CoursesClient({
  courses,
  canEdit,
}: {
  courses: CourseRow[];
  canEdit: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:courses");
  const [isExporting, startExport] = useTransition();

  useEffect(() => { setPageIndex(0); }, [search, pageSize, activeFilter]);

  const filtered = courses.filter((c) => {
    if (activeFilter === "active"   && !c.is_active) return false;
    if (activeFilter === "inactive" &&  c.is_active) return false;
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const columns = getCourseColumns(canEdit ? setEditingCourse : undefined);

  return (
    <>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o código…"
        filters={
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeFilter === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isExporting}
              onClick={() =>
                startExport(async () => {
                  const { exportCoursesExcel } = await import("@/lib/utils/export-courses-excel");
                  await exportCoursesExcel(courses);
                })
              }
            >
              <Download className="mr-1 h-4 w-4" />
              {isExporting ? "Generando…" : "Descargar catálogo"}
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nuevo curso
              </Button>
            )}
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
      />

      {canEdit && (
        <>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo curso</DialogTitle>
              </DialogHeader>
              <CourseForm key="create" onSuccess={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar curso</DialogTitle>
              </DialogHeader>
              {editingCourse && (
                <CourseForm
                  key={editingCourse.id}
                  course={editingCourse}
                  onSuccess={() => setEditingCourse(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
