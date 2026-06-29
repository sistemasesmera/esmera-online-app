"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createContract } from "@/app/(app)/crm/contracts/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { StudentRow } from "@/lib/data/students.repository";
import { createContractSchema, type CreateContractInput } from "@/lib/domain/contracts/schema";

export function ContractForm({
  students,
  onSuccess,
}: {
  students: StudentRow[];
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateContractInput>({
    resolver: zodResolver(createContractSchema),
    defaultValues: { student_id: "", amount: undefined, document_url: "" },
  });

  const studentOptions = [
    { value: "", label: "Sin alumno vinculado" },
    ...students.map((s) => ({ value: s.id, label: `${s.full_name} (${s.dni_nie})` })),
  ];

  return (
    <form
      onSubmit={form.handleSubmit((data) => {
        setServerError(null);
        startTransition(async () => {
          const result = await createContract(data);
          if (result.error) setServerError(result.error);
          else { toast.success("Contrato creado"); onSuccess(); }
        });
      })}
      className="flex flex-col gap-4"
    >
      <ComboboxField label="Alumno (opcional)" name="student_id" control={form.control} options={studentOptions} placeholder="Sin alumno" />
      <TextField
        label="Importe (€)"
        type="number"
        registration={form.register("amount", { valueAsNumber: true })}
        error={form.formState.errors.amount}
      />
      <TextField
        label="URL documento (opcional)"
        type="url"
        registration={form.register("document_url")}
        error={form.formState.errors.document_url}
      />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Creando…" : "Crear contrato"}</Button>
      </div>
    </form>
  );
}
