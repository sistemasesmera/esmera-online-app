"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createStudent, updateStudent } from "@/app/(app)/students/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { DatePickerField } from "@/components/shared/form-fields/date-picker-field";
import { TextareaField } from "@/components/shared/form-fields/textarea-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { StudentWithComercial } from "@/lib/data/students.repository";
import type { UserRow } from "@/lib/data/users.repository";
import {
  createStudentSchema,
  updateStudentSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from "@/lib/domain/students/schema";
import { PROVINCE_OPTIONS } from "@/lib/domain/shared/provinces";

export function StudentForm({
  student,
  users = [],
  canAssign = false,
  onSuccess,
}: {
  student?: StudentWithComercial;
  users?: UserRow[];
  canAssign?: boolean;
  onSuccess?: () => void;
}) {
  const isEdit = !!student;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      first_name: "", last_name: "", dni_nie: "", email: "",
      phone: "", address: "", province: "", postal_code: "", birth_date: "",
    },
  });

  const editForm = useForm<UpdateStudentInput>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: {
      first_name: student?.first_name ?? "",
      last_name: student?.last_name ?? "",
      dni_nie: student?.dni_nie ?? "",
      email: student?.email ?? "",
      phone: student?.phone ?? "",
      address: student?.address ?? "",
      province: student?.province ?? "",
      postal_code: student?.postal_code ?? "",
      birth_date: student?.birth_date ?? "",
      status: student?.status ?? "en_formacion",
      assigned_to: student?.assigned_to ?? null,
    },
  });

  const comercialOptions = [
    { value: "", label: "Sin asignar" },
    ...users
      .filter((u) => ["comercial", "jefe_comercial", "tech"].includes(u.role as string))
      .map((u) => ({ value: u.id, label: u.full_name })),
  ];

  if (isEdit) {
    return (
      <form
        onSubmit={editForm.handleSubmit((data) => {
          setServerError(null);
          startTransition(async () => {
            const result = await updateStudent(student.id, data);
            if (result.error) setServerError(result.error);
            else { toast.success("Datos del alumno actualizados"); onSuccess?.(); }
          });
        })}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Nombre" registration={editForm.register("first_name")} error={editForm.formState.errors.first_name} />
          <TextField label="Apellidos" registration={editForm.register("last_name")} error={editForm.formState.errors.last_name} />
        </div>
        <TextField label="DNI / NIE" registration={editForm.register("dni_nie")} error={editForm.formState.errors.dni_nie} />
        <TextField label="Email" type="email" registration={editForm.register("email")} error={editForm.formState.errors.email} />
        <TextField label="Teléfono (opcional)" registration={editForm.register("phone")} error={editForm.formState.errors.phone} />
        <TextareaField label="Dirección (opcional)" registration={editForm.register("address")} error={editForm.formState.errors.address} />
        <div className="grid grid-cols-2 gap-4">
          <ComboboxField label="Provincia (opcional)" name="province" control={editForm.control} options={PROVINCE_OPTIONS} placeholder="Buscar provincia…" />
          <TextField label="Código postal (opcional)" registration={editForm.register("postal_code")} error={editForm.formState.errors.postal_code} />
        </div>
        <DatePickerField label="Fecha de nacimiento (opcional)" name="birth_date" control={editForm.control} />
        {canAssign && (
          <ComboboxField
            label="Comercial asignado (opcional)"
            name="assigned_to"
            control={editForm.control}
            options={comercialOptions}
            placeholder="Sin asignar…"
          />
        )}
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={createForm.handleSubmit((data) => {
        setServerError(null);
        startTransition(async () => {
          const result = await createStudent(data);
          if (result.error) setServerError(result.error);
          else { toast.success("Alumno creado"); onSuccess?.(); }
        });
      })}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Nombre" registration={createForm.register("first_name")} error={createForm.formState.errors.first_name} />
        <TextField label="Apellidos" registration={createForm.register("last_name")} error={createForm.formState.errors.last_name} />
      </div>
      <TextField label="DNI / NIE" registration={createForm.register("dni_nie")} error={createForm.formState.errors.dni_nie} />
      <TextField label="Email" type="email" registration={createForm.register("email")} error={createForm.formState.errors.email} />
      <TextField label="Teléfono (opcional)" registration={createForm.register("phone")} error={createForm.formState.errors.phone} />
      <TextareaField label="Dirección (opcional)" registration={createForm.register("address")} error={createForm.formState.errors.address} />
      <div className="grid grid-cols-2 gap-4">
        <ComboboxField label="Provincia (opcional)" name="province" control={createForm.control} options={PROVINCE_OPTIONS} placeholder="Buscar provincia…" />
        <TextField label="Código postal (opcional)" registration={createForm.register("postal_code")} error={createForm.formState.errors.postal_code} />
      </div>
      <DatePickerField label="Fecha de nacimiento (opcional)" name="birth_date" control={createForm.control} />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onSuccess?.()} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear alumno"}
        </Button>
      </div>
    </form>
  );
}
