"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createCertificate } from "@/app/(app)/certificates/actions";
import { ComboboxField } from "@/components/shared/form-fields/combobox-field";
import { TextField } from "@/components/shared/form-fields/text-field";
import { Button } from "@/components/ui/button";
import type { EnrollmentForCertificate } from "@/lib/data/certificates.repository";
import { createCertificateSchema, type CreateCertificateInput } from "@/lib/domain/certificates/schema";

export function CertificateForm({
  enrollments,
  onSuccess,
}: {
  enrollments: EnrollmentForCertificate[];
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateCertificateInput>({
    resolver: zodResolver(createCertificateSchema),
    defaultValues: { enrollment_id: "", document_url: "" },
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
          const result = await createCertificate(data);
          if (result.error) setServerError(result.error);
          else { toast.success("Certificado creado"); onSuccess(); }
        });
      })}
      className="flex flex-col gap-4"
    >
      <ComboboxField
        label="Matrícula"
        name="enrollment_id"
        control={form.control}
        options={enrollmentOptions}
        placeholder="Buscar alumno o curso…"
      />
      <TextField
        label="URL del documento (opcional)"
        type="url"
        registration={form.register("document_url")}
        error={form.formState.errors.document_url}
      />
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Creando…" : "Crear certificado"}</Button>
      </div>
    </form>
  );
}
