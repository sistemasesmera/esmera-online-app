import { CalendarIcon } from "lucide-react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePickerField<TFieldValues extends FieldValues>({
  label,
  name,
  control,
  placeholder = "Selecciona una fecha",
  fromYear = 1940,
  toYear = new Date().getFullYear(),
}: {
  label: string;
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectedDate: Date | undefined = field.value ? parseLocalDate(field.value) : undefined;

        return (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={name}
                  type="button"
                  variant="outline"
                  aria-invalid={!!fieldState.error}
                  className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate ? selectedDate.toLocaleDateString("es-ES") : placeholder}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => field.onChange(date ? formatLocalDate(date) : null)}
                  captionLayout="dropdown"
                  startMonth={new Date(fromYear, 0)}
                  endMonth={new Date(toYear, 11)}
                  defaultMonth={selectedDate ?? new Date(toYear - 25, 0)}
                />
              </PopoverContent>
            </Popover>
            <FieldError errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
