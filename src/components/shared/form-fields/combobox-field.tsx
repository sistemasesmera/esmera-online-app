import { Check, ChevronsUpDown } from "lucide-react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function ComboboxField<TFieldValues extends FieldValues>({
  label,
  name,
  control,
  options,
  placeholder = "Selecciona una opción",
  emptyMessage = "Sin resultados",
}: {
  label: string;
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues, any, any>;
  options: { value: string; label: string }[];
  placeholder?: string;
  emptyMessage?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectedOption = options.find((option) => option.value === field.value);

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
                  className={cn("justify-between font-normal", !selectedOption && "text-muted-foreground")}
                >
                  {selectedOption?.label ?? placeholder}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command>
                  <CommandInput placeholder={placeholder} />
                  <CommandList className="max-h-48 overflow-y-auto">
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          onSelect={() => field.onChange(option.value)}
                        >
                          <Check
                            className={cn("h-4 w-4", option.value === field.value ? "opacity-100" : "opacity-0")}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FieldError errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
