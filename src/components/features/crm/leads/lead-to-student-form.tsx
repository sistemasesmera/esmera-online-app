"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { convertLeadToStudent } from "@/app/(app)/crm/leads/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { DatePickerField } from "@/components/shared/form-fields/date-picker-field";
import { PhoneField } from "@/components/shared/form-fields/phone-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { TextareaField } from "@/components/shared/form-fields/textarea-field";
import { PaymentPlanField } from "@/components/shared/payment-plan-field";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CourseRow } from "@/lib/data/courses.repository";
import type { LeadWithJoins } from "@/lib/data/leads.repository";
import { convertLeadSchema, type ConvertLeadInput } from "@/lib/domain/students/schema";
import { PROVINCE_OPTIONS } from "@/lib/domain/shared/provinces";

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function LeadToStudentForm({
  lead,
  courses,
  onSuccess,
}: {
  lead: LeadWithJoins;
  courses: CourseRow[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { first, last } = splitName(lead.full_name);
  const today = new Date().toISOString().split("T")[0];

  const form = useForm<ConvertLeadInput>({
    resolver: zodResolver(convertLeadSchema),
    defaultValues: {
      first_name: first,
      last_name: last,
      dni_nie: lead.dni_nie ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      address: lead.address ?? "",
      province: lead.province ?? "",
      postal_code: lead.postal_code ?? "",
      birth_date: lead.birth_date ?? "",
      course_id: "",
      enrollment_date: today,
      amount: 0,
      notes: "",
      payment_type: undefined,
      cash_method: null,
      cash_amount: null,
      financer: null,
      financed_amount: null,
    },
  });

  const courseOptions = courses
    .filter((c) => c.is_active)
    .map((c) => ({ value: c.id, label: c.name }));

  function onSubmit(data: ConvertLeadInput) {
    setServerError(null);
    const cleaned: ConvertLeadInput = { ...data, notes: data.notes || undefined };
    startTransition(async () => {
      const result = await convertLeadToStudent(lead.id, cleaned);
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success(`${data.first_name} ${data.last_name} matriculado. Pendiente de validación.`);
        router.push(`/enrollments/${result.enrollmentId}`);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Datos del alumno
        </p>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Nombre"
            registration={form.register("first_name")}
            error={form.formState.errors.first_name}
          />
          <TextField
            label="Apellidos"
            registration={form.register("last_name")}
            error={form.formState.errors.last_name}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <TextField
            label="DNI / NIE"
            registration={form.register("dni_nie")}
            error={form.formState.errors.dni_nie}
          />
          <TextField
            label="Email"
            type="email"
            registration={form.register("email")}
            error={form.formState.errors.email}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <PhoneField
            label="Teléfono"
            name="phone"
            control={form.control}
            error={form.formState.errors.phone}
            required
          />
          <TextField
            label="Dirección"
            registration={form.register("address")}
            error={form.formState.errors.address}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
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
        <div className="mt-3">
          <DatePickerField
            label="Fecha de nacimiento"
            name="birth_date"
            control={form.control}
            placeholder="Selecciona fecha de nacimiento"
          />
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Matrícula inicial — pendiente de validación por administración
        </p>
        <div className="flex flex-col gap-3">
          <ComboboxField
            label="Curso"
            name="course_id"
            control={form.control}
            options={courseOptions}
            placeholder="Selecciona un curso…"
          />
          <TextField
            label="Fecha de matrícula"
            type="date"
            registration={form.register("enrollment_date")}
            error={form.formState.errors.enrollment_date}
          />
          <TextField
            label="Importe del contrato (€)"
            type="number"
            registration={form.register("amount", { valueAsNumber: true })}
            error={form.formState.errors.amount}
          />
          <TextareaField
            label="Notas (opcional)"
            registration={form.register("notes")}
            error={form.formState.errors.notes}
          />
          <PaymentPlanField
            watch={form.watch}
            setValue={form.setValue}
            register={form.register}
            totalAmount={form.watch("amount") ?? 0}
            error={form.formState.errors.payment_type}
            cashMethodError={form.formState.errors.cash_method}
            financerError={form.formState.errors.financer}
          />
        </div>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" disabled={isPending} onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Matriculando…" : "Matricular alumno"}
        </Button>
      </div>
    </form>
  );
}
