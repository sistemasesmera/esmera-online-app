"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { addLeadInteraction, type LeadInteractionInput } from "@/app/(app)/crm/leads/[id]/actions";
import { SelectField } from "@/components/shared/form-fields/select-field";
import { TextareaField } from "@/components/shared/form-fields/textarea-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { LeadInteractionRow } from "@/lib/data/lead-interactions.repository";

const schema = z.object({
  contact_type: z.enum(["llamada_saliente", "llamada_entrante", "email", "whatsapp", "reunion", "otro"] as const),
  notes: z.string().min(1, "Requerido"),
  followup_date: z.string().min(1, "Requerida"),
  next_followup_date: z.string().optional(),
});

const CONTACT_TYPE_OPTIONS = [
  { value: "llamada_saliente", label: "Llamada saliente" },
  { value: "llamada_entrante", label: "Llamada entrante" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "reunion", label: "Reunión" },
  { value: "otro", label: "Otro" },
];

export function LeadInteractionForm({
  leadId,
  onSuccess,
  onCancel,
}: {
  leadId: string;
  onSuccess: (row: LeadInteractionRow) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const form = useForm<LeadInteractionInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      contact_type: "llamada_saliente",
      notes: "",
      followup_date: today,
      next_followup_date: "",
    },
  });

  function onSubmit(data: LeadInteractionInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await addLeadInteraction(leadId, {
        ...data,
        next_followup_date: data.next_followup_date || undefined,
      });
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success("Contacto registrado");
        if (result.data) onSuccess(result.data as LeadInteractionRow);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Tipo de contacto"
          name="contact_type"
          control={form.control}
          options={CONTACT_TYPE_OPTIONS}
        />
        <TextField
          label="Fecha"
          type="date"
          registration={form.register("followup_date")}
          error={form.formState.errors.followup_date}
        />
      </div>
      <TextareaField
        label="Notas"
        registration={form.register("notes")}
        error={form.formState.errors.notes}
      />
      <TextField
        label="Próximo contacto (opcional)"
        type="date"
        registration={form.register("next_followup_date")}
        error={form.formState.errors.next_followup_date}
      />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar contacto"}
        </Button>
      </div>
    </form>
  );
}
