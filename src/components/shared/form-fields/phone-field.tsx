"use client";

import { forwardRef } from "react";
import { Controller, type Control, type FieldError } from "react-hook-form";
import PhoneInput, { type Value } from "react-phone-number-input";

import { Field, FieldError as FieldErrorMessage, FieldLabel } from "@/components/ui/field";

const PhoneInputAdapter = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className: _className, ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:text-muted-foreground"
    />
  )
);
PhoneInputAdapter.displayName = "PhoneInputAdapter";

export function PhoneField({
  label,
  name,
  control,
  error,
  required,
}: {
  label: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  error?: FieldError;
  required?: boolean;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </FieldLabel>
      <div
        data-invalid={!!error}
        className="phone-field-wrapper flex h-9 w-full items-center gap-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring data-[invalid=true]:border-destructive"
      >
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <PhoneInput
              id={name}
              defaultCountry="ES"
              value={(field.value as Value) ?? undefined}
              onChange={(val) => field.onChange(val ?? "")}
              inputComponent={PhoneInputAdapter}
              placeholder="612 345 678"
            />
          )}
        />
      </div>
      <FieldErrorMessage errors={[error]} />
    </Field>
  );
}
