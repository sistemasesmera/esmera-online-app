"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Phone, Video } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createFollowup, updateFollowup } from "@/app/(app)/tutoring/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { DatePickerField } from "@/components/shared/form-fields/date-picker-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { EnrollmentForFollowup } from "@/lib/data/followups.repository";
import {
  createFollowupSchema,
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  type CreateFollowupInput,
} from "@/lib/domain/followups/schema";
import type { ContactType } from "@/types/database.types";
import { cn } from "@/lib/utils";

const CONTACT_ICON: Record<ContactType, React.ElementType> = {
  llamada: Phone,
  correo: Mail,
  videollamada: Video,
  whatsapp: Phone,
  otro: Phone,
};

type FollowupData = { id: string; contact_type: ContactType; notes: string; followup_date: string };

type Props = {
  enrollments: EnrollmentForFollowup[];
  presetEnrollmentId?: string;
  onSuccess: () => void;
  followup?: FollowupData;
};

export function FollowupForm({ enrollments, presetEnrollmentId, onSuccess, followup }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!followup;

  const form = useForm<CreateFollowupInput>({
    resolver: zodResolver(createFollowupSchema),
    defaultValues: {
      enrollment_id: presetEnrollmentId ?? "",
      contact_type: followup?.contact_type ?? "llamada",
      notes: followup?.notes ?? "",
      followup_date: followup?.followup_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    },
  });

  const enrollmentOptions = enrollments.map((e) => ({
    value: e.id,
    label: `${e.students?.full_name ?? "?"} — ${e.courses?.name ?? "?"}`,
  }));

  return (
    <form
      onSubmit={form.handleSubmit((data) => {
        setServerError(null);
        startTransition(async () => {
          const result = isEdit
            ? await updateFollowup(followup!.id, { contact_type: data.contact_type, notes: data.notes, followup_date: data.followup_date })
            : await createFollowup(data);
          if (result.error) setServerError(result.error);
          else { toast.success(isEdit ? "Tutoría actualizada" : "Tutoría registrada"); onSuccess(); }
        });
      })}
      className="flex flex-col gap-5"
    >
      {!presetEnrollmentId && (
        <ComboboxField
          label="Matrícula"
          name="enrollment_id"
          control={form.control}
          options={enrollmentOptions}
          placeholder="Buscar alumno o curso…"
        />
      )}

      {/* Tipo de contacto */}
      <Controller
        name="contact_type"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel>Tipo de contacto</FieldLabel>
            <div className="flex gap-2">
              {CONTACT_TYPES.map((type) => {
                const Icon = CONTACT_ICON[type];
                const active = field.value === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => field.onChange(type)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {CONTACT_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {/* Fecha de la tutoría */}
      <DatePickerField
        label="Fecha de la tutoría"
        name="followup_date"
        control={form.control}
      />

      {/* Notas */}
      <Controller
        name="notes"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel>Notas de la tutoría</FieldLabel>
            <Textarea
              {...field}
              placeholder="Describe el seguimiento realizado…"
              rows={5}
              className="resize-none"
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEdit ? "Guardando…" : "Registrando…") : (isEdit ? "Guardar cambios" : "Registrar tutoría")}
        </Button>
      </div>
    </form>
  );
}
