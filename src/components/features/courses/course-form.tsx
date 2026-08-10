"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createCourse, updateCourse } from "@/app/(app)/courses/actions";
import { CourseFileUpload } from "@/components/features/courses/course-file-upload";
import { SwitchField } from "@/components/shared/form-fields/switch-field";
import { TextareaField } from "@/components/shared/form-fields/textarea-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { CourseRow } from "@/lib/data/courses.repository";
import {
  createCourseSchema,
  updateCourseSchema,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/lib/domain/courses/schema";

function SubmitRow({
  isPending,
  isEdit,
  onCancel,
}: {
  isPending: boolean;
  isEdit: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear curso"}
      </Button>
    </div>
  );
}

export function CourseForm({ course, onSuccess }: { course?: CourseRow; onSuccess: () => void }) {
  const isEdit = !!course;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "",
      description: "",
      is_fundae: false,
      is_certificado_profesionalidad: false,
    },
  });

  const editForm = useForm<UpdateCourseInput>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: {
      name: course?.name ?? "",
      code: course?.code ?? "",
      category: course?.category ?? "",
      description: course?.description ?? "",
      duration_hours: course?.duration_hours ?? undefined,
      price: course?.price != null ? Number(course.price) : undefined,
      is_fundae: false,
      is_certificado_profesionalidad: false,
      is_active: course?.is_active ?? true,
    },
  });

  if (isEdit) {
    return (
      <form
        onSubmit={editForm.handleSubmit((data) => {
          setServerError(null);
          startTransition(async () => {
            const result = await updateCourse(course.id, data);
            if (result.error) setServerError(result.error);
            else { toast.success("Curso actualizado"); onSuccess(); }
          });
        })}
        className="flex flex-col gap-4"
      >
        <TextField label="Nombre del curso" registration={editForm.register("name")} error={editForm.formState.errors.name} />
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField label="Código interno (opcional)" registration={editForm.register("code")} error={editForm.formState.errors.code} />
          </div>
          <div className="flex-1">
            <TextField label="Categoría (opcional)" registration={editForm.register("category")} error={editForm.formState.errors.category} />
          </div>
        </div>
        <TextareaField label="Descripción (opcional)" registration={editForm.register("description")} error={editForm.formState.errors.description} />
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField label="Duración en horas (opcional)" type="number" registration={editForm.register("duration_hours", { valueAsNumber: true })} error={editForm.formState.errors.duration_hours} />
          </div>
          <div className="flex-1">
            <TextField label="Precio (€)" type="number" registration={editForm.register("price", { valueAsNumber: true })} error={editForm.formState.errors.price as { message?: string; type: string } | undefined} />
          </div>
        </div>
        <SwitchField label="Curso activo" name="is_active" control={editForm.control} />

        <div className="border-t pt-4 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos del curso</p>
          <CourseFileUpload
            courseId={course.id}
            field="dossier_url"
            label="Dossier"
            currentUrl={course.dossier_url ?? null}
          />
          <CourseFileUpload
            courseId={course.id}
            field="temario_url"
            label="Temario"
            currentUrl={course.temario_url ?? null}
          />
        </div>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <SubmitRow isPending={isPending} isEdit onCancel={onSuccess} />
      </form>
    );
  }

  return (
    <form
      onSubmit={createForm.handleSubmit((data) => {
        setServerError(null);
        startTransition(async () => {
          const result = await createCourse(data);
          if (result.error) setServerError(result.error);
          else { toast.success("Curso creado"); onSuccess(); }
        });
      })}
      className="flex flex-col gap-4"
    >
      <TextField label="Nombre del curso" registration={createForm.register("name")} error={createForm.formState.errors.name} />
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField label="Código interno (opcional)" registration={createForm.register("code")} error={createForm.formState.errors.code} />
        </div>
        <div className="flex-1">
          <TextField label="Categoría (opcional)" registration={createForm.register("category")} error={createForm.formState.errors.category} />
        </div>
      </div>
      <TextareaField label="Descripción (opcional)" registration={createForm.register("description")} error={createForm.formState.errors.description} />
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField label="Duración en horas (opcional)" type="number" registration={createForm.register("duration_hours", { valueAsNumber: true })} error={createForm.formState.errors.duration_hours} />
        </div>
        <div className="flex-1">
          <TextField label="Precio (€)" type="number" registration={createForm.register("price", { valueAsNumber: true })} error={createForm.formState.errors.price as { message?: string; type: string } | undefined} />
        </div>
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <SubmitRow isPending={isPending} isEdit={false} onCancel={onSuccess} />
    </form>
  );
}
