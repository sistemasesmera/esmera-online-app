import { CalendarIcon } from "lucide-react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePickerField<TFieldValues extends FieldValues>({
  label,
  name,
  control,
  placeholder = "Selecciona una fecha",
}: {
  label: string;
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  placeholder?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectedDate: Date | undefined = field.value ? new Date(field.value) : undefined;

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
                  onSelect={(date) => field.onChange(date ? date.toISOString().slice(0, 10) : null)}
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
