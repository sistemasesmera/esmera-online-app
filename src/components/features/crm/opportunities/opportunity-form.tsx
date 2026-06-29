"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createOpportunity, updateOpportunity } from "@/app/(app)/crm/opportunities/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { SelectField } from "@/components/shared/form-fields/select-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { LeadRow } from "@/lib/data/leads.repository";
import type { OpportunityRow } from "@/lib/data/opportunities.repository";
import type { PipelineStageRow } from "@/lib/data/pipeline-stages.repository";
import type { UserRow } from "@/lib/data/users.repository";
import { opportunitySchema, type OpportunityInput } from "@/lib/domain/opportunities/schema";

type Props = {
  opportunity?: OpportunityRow;
  leads: LeadRow[];
  stages: PipelineStageRow[];
  courses: CourseRow[];
  users: UserRow[];
  currentUserId: string;
  onSuccess: () => void;
};

export function OpportunityForm({ opportunity, leads, stages, courses, users, currentUserId, onSuccess }: Props) {
  const isEdit = !!opportunity;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<OpportunityInput>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      lead_id: opportunity?.lead_id ?? "",
      stage_id: opportunity?.stage_id ?? "",
      course_id: opportunity?.course_id ?? "",
      estimated_amount: opportunity?.estimated_amount ?? undefined,
      owner_id: opportunity?.owner_id ?? currentUserId,
    },
  });

  const leadOptions = leads.map((l) => ({ value: l.id, label: l.full_name }));
  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const courseOptions = [
    { value: "", label: "Sin curso" },
    ...courses.map((c) => ({ value: c.id, label: c.code ? `${c.name} (${c.code})` : c.name })),
  ];
  const userOptions = users.map((u) => ({ value: u.id, label: u.full_name }));

  const onSubmit = form.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateOpportunity(opportunity.id, data)
        : await createOpportunity(data);
      if (result.error) setServerError(result.error);
      else { toast.success(isEdit ? "Oportunidad actualizada" : "Oportunidad creada"); onSuccess(); }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ComboboxField label="Lead" name="lead_id" control={form.control} options={leadOptions} placeholder="Buscar lead…" />
      <SelectField label="Etapa" name="stage_id" control={form.control} options={stageOptions} />
      <ComboboxField label="Curso (opcional)" name="course_id" control={form.control} options={courseOptions} placeholder="Sin curso" />
      <TextField
        label="Importe estimado € (opcional)"
        type="number"
        registration={form.register("estimated_amount", {
          setValueAs: (v) => (v === "" || v == null) ? undefined : parseFloat(v),
        })}
        error={form.formState.errors.estimated_amount}
      />
      <ComboboxField label="Propietario" name="owner_id" control={form.control} options={userOptions} placeholder="Selecciona propietario…" />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear oportunidad"}
        </Button>
      </div>
    </form>
  );
}
