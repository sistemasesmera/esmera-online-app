import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function TextareaField({
  label,
  error,
  registration,
}: {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={registration.name}>{label}</FieldLabel>
      <Textarea id={registration.name} aria-invalid={!!error} {...registration} />
      <FieldErrorMessage errors={[error]} />
    </Field>
  );
}
