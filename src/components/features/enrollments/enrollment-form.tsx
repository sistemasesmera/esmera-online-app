"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { createEnrollment } from "@/app/(app)/enrollments/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { DatePickerField } from "@/components/shared/form-fields/date-picker-field";
import { TextareaField } from "@/components/shared/form-fields/textarea-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { PaymentPlanField } from "@/components/shared/payment-plan-field";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { StudentRow } from "@/lib/data/students.repository";
import {
  createEnrollmentSchema,
  DURATION_OPTIONS,
  type CreateEnrollmentInput,
} from "@/lib/domain/enrollments/schema";

type Props = {
  courses: CourseRow[];
  presetStudentId?: string;
  students?: StudentRow[];
  onSuccess: () => void;
};

const TODAY = new Date().toISOString().slice(0, 10);

export function EnrollmentForm({ courses, presetStudentId, students, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateEnrollmentInput>({
    resolver: zodResolver(createEnrollmentSchema),
    defaultValues: {
      student_id: presetStudentId ?? "",
      course_id: "",
      enrollment_date: TODAY,
      duration_months: null,
      amount: 0,
      notes: "",
      payment_type: undefined,
      cash_method: null,
      cash_amount: null,
      financer: null,
      financed_amount: null,
    },
  });

  const courseOptions = courses.filter((c) => c.is_active).map((c) => ({
    value: c.id,
    label: c.code ? `${c.name} (${c.code})` : c.name,
  }));
  const studentOptions = (students ?? []).map((s) => ({
    value: s.id,
    label: `${s.full_name} (${s.dni_nie})`,
  }));

  return (
    <form
      onSubmit={form.handleSubmit((data) => {
        setServerError(null);
        startTransition(async () => {
          const result = await createEnrollment(data);
          if (result.error) setServerError(result.error);
          else { toast.success("Matrícula creada"); onSuccess(); }
        });
      })}
      className="flex flex-col gap-4"
    >
      {!presetStudentId && students && (
        <ComboboxField
          label="Alumno"
          name="student_id"
          control={form.control}
          options={studentOptions}
          placeholder="Buscar alumno…"
        />
      )}
      <ComboboxField
        label="Curso"
        name="course_id"
        control={form.control}
        options={courseOptions}
        placeholder="Buscar curso…"
      />
      <DatePickerField label="Fecha de matrícula" name="enrollment_date" control={form.control} />
      <Controller
        name="duration_months"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Duración</FieldLabel>
            <Select
              value={field.value != null ? String(field.value) : ""}
              onValueChange={(v) => field.onChange(v ? Number(v) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la duración…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin especificar</SelectItem>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      <TextField
        label="Importe del contrato (€)"
        type="number"
        registration={form.register("amount", { valueAsNumber: true })}
        error={form.formState.errors.amount}
      />
      <TextareaField label="Notas (opcional)" registration={form.register("notes")} error={form.formState.errors.notes} />
      <PaymentPlanField
        watch={form.watch}
        setValue={form.setValue}
        register={form.register}
        totalAmount={form.watch("amount") ?? 0}
        error={form.formState.errors.payment_type}
        cashMethodError={form.formState.errors.cash_method}
        financerError={form.formState.errors.financer}
      />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear matrícula"}
        </Button>
      </div>
    </form>
  );
}
