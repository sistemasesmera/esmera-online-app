"use client";

import { useEffect, useState } from "react";

import { getStudentColumns } from "@/components/features/students/student-columns";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar";
import type { StudentWithComercial } from "@/lib/data/students.repository";

const PAGE_SIZE = 20;

export function StudentsClient({ students, canEdit = false }: { students: StudentWithComercial[]; canEdit?: boolean }) {
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => { setPageIndex(0); }, [search]);

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.dni_nie.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

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
        pagination={{ pageIndex, pageCount, onPageChange: setPageIndex }}
      />
    </>
  );
}
