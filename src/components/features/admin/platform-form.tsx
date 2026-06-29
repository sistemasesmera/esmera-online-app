"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createPlatform, updatePlatform } from "@/app/(app)/admin/platforms/actions";
import { SwitchField } from "@/components/shared/form-fields/switch-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { PlatformRow } from "@/lib/data/platforms.repository";
import {
  createPlatformSchema,
  updatePlatformSchema,
  type CreatePlatformInput,
  type UpdatePlatformInput,
} from "@/lib/domain/catalogs/schema";

export function PlatformForm({
  platform,
  onSuccess,
}: {
  platform?: PlatformRow;
  onSuccess: () => void;
}) {
  const isEdit = !!platform;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<CreatePlatformInput>({
    resolver: zodResolver(createPlatformSchema),
    defaultValues: { code: "", name: "", is_active: true },
  });

  const editForm = useForm<UpdatePlatformInput>({
    resolver: zodResolver(updatePlatformSchema),
    defaultValues: { name: platform?.name ?? "", is_active: platform?.is_active ?? true },
  });

  const handleCreateSubmit = createForm.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createPlatform(data);
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success("Plataforma creada");
        onSuccess();
      }
    });
  });

  const handleEditSubmit = editForm.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updatePlatform(platform!.id, data);
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success("Plataforma actualizada");
        onSuccess();
      }
    });
  });

  if (isEdit) {
    return (
      <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Código: </span>
          <span className="font-mono font-medium">{platform.code}</span>
        </div>
        <TextField
          label="Nombre"
          registration={editForm.register("name")}
          error={editForm.formState.errors.name}
        />
        <SwitchField label="Activa" name="is_active" control={editForm.control} />
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
      <TextField
        label="Código"
        registration={createForm.register("code")}
        error={createForm.formState.errors.code}
      />
      <TextField
        label="Nombre"
        registration={createForm.register("name")}
        error={createForm.formState.errors.name}
      />
      <SwitchField label="Activa" name="is_active" control={createForm.control} />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear plataforma"}
        </Button>
      </div>
    </form>
  );
}
