"use client";

import { useEffect, useState } from "react";

import { usePersistedPageSize } from "@/hooks/use-persisted-page-size";
import { getStudentColumns } from "@/components/features/students/student-columns";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import type { StudentWithComercial } from "@/lib/data/students.repository";

export function StudentsClient({ students, canEdit = false }: { students: StudentWithComercial[]; canEdit?: boolean }) {
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("esmera:pageSize:students");

  useEffect(() => { setPageIndex(0); }, [search, pageSize]);

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.dni_nie.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const columns = getStudentColumns();

  return (
    <>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, DNI/NIE o email…"
      />
      <DataTable
        columns={columns}
        data={pageData}
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex, pageSize, onPageSizeChange: setPageSize }}
      />
    </>
  );
}
