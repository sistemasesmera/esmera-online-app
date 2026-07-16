"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createUser, updateUser } from "@/app/(app)/admin/users/actions";
import { Button } from "@/components/ui/button";
import { SwitchField } from "@/components/shared/form-fields/switch-field";
import { SelectField } from "@/components/shared/form-fields/select-field";
import { PhoneField } from "@/components/shared/form-fields/phone-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { ROLE_LABELS, APP_ROLES } from "@/lib/domain/shared/permissions";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/domain/users/schema";
import type { UserRow } from "@/lib/data/users.repository";

const ROLE_OPTIONS = APP_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export function UserForm({ user, onSuccess }: { user?: UserRow; onSuccess: () => void }) {
  const isEdit = !!user;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { full_name: "", email: "", role: "comercial", phone: "", password: "" },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      role: user?.role ?? "comercial",
      phone: user?.phone ?? "",
      is_active: user?.is_active ?? true,
      password: "",
    },
  });

  const handleCreateSubmit = createForm.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createUser(data);
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success("Usuario creado correctamente");
        onSuccess();
      }
    });
  });

  const handleEditSubmit = editForm.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateUser(user!.id, data);
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success("Usuario actualizado");
        onSuccess();
      }
    });
  });

  if (isEdit) {
    return (
      <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre completo"
          registration={editForm.register("full_name")}
          error={editForm.formState.errors.full_name}
        />
        <SelectField
          label="Rol"
          name="role"
          control={editForm.control}
          options={ROLE_OPTIONS}
        />
        <PhoneField
          label="Teléfono"
          name="phone"
          control={editForm.control}
          error={editForm.formState.errors.phone}
        />
        <SwitchField label="Cuenta activa" name="is_active" control={editForm.control} />
        <TextField
          label="Nueva contraseña (dejar vacío para no cambiar)"
          type="password"
          registration={editForm.register("password")}
          error={editForm.formState.errors.password}
        />
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
      <TextField
        label="Nombre completo"
        registration={createForm.register("full_name")}
        error={createForm.formState.errors.full_name}
      />
      <TextField
        label="Email"
        type="email"
        registration={createForm.register("email")}
        error={createForm.formState.errors.email}
      />
      <SelectField
        label="Rol"
        name="role"
        control={createForm.control}
        options={ROLE_OPTIONS}
      />
      <PhoneField
        label="Teléfono (opcional)"
        name="phone"
        control={createForm.control}
        error={createForm.formState.errors.phone}
      />
      <TextField
        label="Contraseña temporal"
        type="password"
        registration={createForm.register("password")}
        error={createForm.formState.errors.password}
      />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
