"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";

import { getCourseColumns } from "@/components/features/courses/course-columns";
import { CourseForm } from "@/components/features/courses/course-form";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourseRow } from "@/lib/data/courses.repository";

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
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:courses");

  useEffect(() => { setPageIndex(0); }, [search, pageSize]);

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const columns = getCourseColumns(canEdit ? setEditingCourse : undefined);

  return (
    <>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o código…"
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Nuevo curso
            </Button>
          ) : undefined
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
