import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function TextField({
  label,
  type = "text",
  error,
  registration,
}: {
  label: string;
  type?: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={registration.name}>{label}</FieldLabel>
      <Input id={registration.name} type={type} aria-invalid={!!error} {...registration} />
      <FieldErrorMessage errors={[error]} />
    </Field>
  );
}
