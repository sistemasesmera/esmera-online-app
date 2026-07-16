"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createLead, updateLead } from "@/app/(app)/crm/leads/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { DatePickerField } from "@/components/shared/form-fields/date-picker-field";
import { SelectField } from "@/components/shared/form-fields/select-field";
import { TextareaField } from "@/components/shared/form-fields/textarea-field";
import { PhoneField } from "@/components/shared/form-fields/phone-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { LeadRow } from "@/lib/data/leads.repository";
import type { UserRow } from "@/lib/data/users.repository";
import {
  leadSchema,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  type LeadInput,
} from "@/lib/domain/leads/schema";
import { Globe, Leaf, Megaphone, FileText } from "lucide-react";
import { PROVINCE_OPTIONS } from "@/lib/domain/shared/provinces";
import type { LeadSource } from "@/types/database.types";

const SOURCE_ICONS: Record<LeadSource, React.ReactNode> = {
  organico: <Leaf className="h-3.5 w-3.5 text-emerald-600" />,
  meta_ads: <Megaphone className="h-3.5 w-3.5 text-blue-600" />,
  web:      <Globe className="h-3.5 w-3.5 text-violet-600" />,
};

type Props = {
  lead?: LeadRow;
  users: UserRow[];
  currentUserId: string;
  canAssign?: boolean;
  onSuccess: () => void;
};

export function LeadForm({ lead, users, currentUserId, canAssign = false, onSuccess }: Props) {
  const isEdit = !!lead;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      full_name: lead?.full_name ?? "",
      email: lead?.email ?? "",
      phone: lead?.phone ?? "",
      source: lead?.source ?? "organico",
      status: lead?.status ?? "nuevo",
      interested_course: lead?.interested_course ?? "",
      notes: lead?.notes ?? "",
      owner_id: lead?.owner_id ?? currentUserId,
      dni_nie: lead?.dni_nie ?? "",
      address: lead?.address ?? "",
      province: lead?.province ?? "",
      postal_code: lead?.postal_code ?? "",
      birth_date: lead?.birth_date ?? "",
    },
  });

  const sourceOptions = LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] }));
  const userOptions = users.map((u) => ({ value: u.id, label: u.full_name }));
  const currentSource = form.watch("source");

  const onSubmit = form.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateLead(lead.id, data as LeadInput)
        : await createLead(data as LeadInput);
      if (result.error) setServerError(result.error);
      else { toast.success(isEdit ? "Lead actualizado" : "Lead creado"); onSuccess(); }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <TextField
        label="Nombre completo"
        registration={form.register("full_name")}
        error={form.formState.errors.full_name}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Email (opcional)" type="email" registration={form.register("email")} error={form.formState.errors.email} />
        <PhoneField label="Teléfono" name="phone" control={form.control} error={form.formState.errors.phone} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Origen</span>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {SOURCE_ICONS[currentSource]}
          <span>{LEAD_SOURCE_LABELS[currentSource]}</span>
          <span className="ml-auto text-xs text-muted-foreground/60">No modificable</span>
        </div>
      </div>
      <TextField
        label="Curso / Formulario de interés (opcional)"
        registration={form.register("interested_course")}
        error={form.formState.errors.interested_course}
      />

      {/* Campos extra solo visibles al editar */}
      {isEdit && (
        <>
          <TextareaField
            label="Notas (opcional)"
            registration={form.register("notes")}
            error={form.formState.errors.notes}
          />
          {canAssign && (
            <ComboboxField
              label="Propietario"
              name="owner_id"
              control={form.control}
              options={userOptions}
              placeholder="Selecciona propietario…"
            />
          )}

          {/* Datos para contrato */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Datos para contrato (opcional)
            </div>
            <TextField
              label="DNI / NIE"
              registration={form.register("dni_nie")}
              error={form.formState.errors.dni_nie}
            />
            <TextareaField
              label="Dirección"
              registration={form.register("address")}
              error={form.formState.errors.address}
            />
            <div className="grid grid-cols-2 gap-4">
              <ComboboxField
                label="Provincia"
                name="province"
                control={form.control}
                options={PROVINCE_OPTIONS}
                placeholder="Buscar provincia…"
              />
              <TextField
                label="Código postal"
                registration={form.register("postal_code")}
                error={form.formState.errors.postal_code}
              />
            </div>
            <DatePickerField
              label="Fecha de nacimiento"
              name="birth_date"
              control={form.control}
            />
          </div>
        </>
      )}

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear lead"}
        </Button>
      </div>
    </form>
  );
}
