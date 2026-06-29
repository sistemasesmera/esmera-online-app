import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SelectField<TFieldValues extends FieldValues>({
  label,
  name,
  control,
  options,
  placeholder = "Selecciona una opción",
}: {
  label: string;
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues, any, any>;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} aria-invalid={!!fieldState.error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
