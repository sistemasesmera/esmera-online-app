"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createPipelineStage, updatePipelineStage } from "@/app/(app)/admin/pipeline-stages/actions";
import { SwitchField } from "@/components/shared/form-fields/switch-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { PipelineStageRow } from "@/lib/data/pipeline-stages.repository";
import {
  createPipelineStageSchema,
  updatePipelineStageSchema,
  type CreatePipelineStageInput,
  type UpdatePipelineStageInput,
} from "@/lib/domain/catalogs/schema";

export function PipelineStageForm({
  stage,
  onSuccess,
}: {
  stage?: PipelineStageRow;
  onSuccess: () => void;
}) {
  const isEdit = !!stage;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<CreatePipelineStageInput>({
    resolver: zodResolver(createPipelineStageSchema),
    defaultValues: { code: "", name: "", display_order: 1, is_won: false, is_lost: false },
  });

  const editForm = useForm<UpdatePipelineStageInput>({
    resolver: zodResolver(updatePipelineStageSchema),
    defaultValues: {
      name: stage?.name ?? "",
      display_order: stage?.display_order ?? 1,
      is_won: stage?.is_won ?? false,
      is_lost: stage?.is_lost ?? false,
    },
  });

  const handleCreateSubmit = createForm.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createPipelineStage(data);
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success("Etapa creada");
        onSuccess();
      }
    });
  });

  const handleEditSubmit = editForm.handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updatePipelineStage(stage!.id, data);
      if (result.error) {
        setServerError(result.error);
      } else {
        toast.success("Etapa actualizada");
        onSuccess();
      }
    });
  });

  if (isEdit) {
    return (
      <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Código: </span>
          <span className="font-mono font-medium">{stage.code}</span>
        </div>
        <TextField
          label="Nombre"
          registration={editForm.register("name")}
          error={editForm.formState.errors.name}
        />
        <TextField
          label="Orden de visualización"
          type="number"
          registration={editForm.register("display_order", { valueAsNumber: true })}
          error={editForm.formState.errors.display_order}
        />
        <SwitchField label="Etapa de venta ganada" name="is_won" control={editForm.control} />
        <SwitchField label="Etapa de venta perdida" name="is_lost" control={editForm.control} />
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
      <TextField
        label="Orden de visualización"
        type="number"
        registration={createForm.register("display_order", { valueAsNumber: true })}
        error={createForm.formState.errors.display_order}
      />
      <SwitchField label="Etapa de venta ganada" name="is_won" control={createForm.control} />
      <SwitchField label="Etapa de venta perdida" name="is_lost" control={createForm.control} />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear etapa"}
        </Button>
      </div>
    </form>
  );
}
