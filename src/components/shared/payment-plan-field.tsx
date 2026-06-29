"use client";

import { Banknote, CreditCard, Layers } from "lucide-react";
import { useEffect } from "react";
import type { Control, UseFormWatch, UseFormSetValue, UseFormRegister } from "react-hook-form";

import type { FieldError } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PAYMENT_TYPES = ["contado", "financiado", "mixto"] as const;
export const CASH_METHODS = ["transferencia", "efectivo"] as const;
export const FINANCERS = ["alma", "sabadell", "sequra", "esmera"] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type CashMethod = (typeof CASH_METHODS)[number];
export type FinancerType = (typeof FINANCERS)[number];

const PAYMENT_TYPE_ICONS = { contado: Banknote, financiado: CreditCard, mixto: Layers };
const PAYMENT_TYPE_LABELS = { contado: "Contado", financiado: "Financiado", mixto: "Mixto" };
const CASH_METHOD_LABELS = { transferencia: "Transferencia", efectivo: "Efectivo" };
const FINANCER_LABELS = { alma: "Alma", sabadell: "Sabadell", sequra: "Sequra", esmera: "Esmera" };

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  totalAmount: number;
  error?: FieldError;
  cashMethodError?: FieldError;
  financerError?: FieldError;
};

export function PaymentPlanField({ watch, setValue, register, totalAmount, error, cashMethodError, financerError }: Props) {
  const paymentType: PaymentType | null = watch("payment_type");
  const cashAmount: number | null = watch("cash_amount");
  const cashMethod: CashMethod | null = watch("cash_method");
  const financer: FinancerType | null = watch("financer");

  // Auto-set amounts for simple cases
  useEffect(() => {
    if (paymentType === "contado") {
      setValue("cash_amount", totalAmount || null);
      setValue("financer", null);
      setValue("financed_amount", null);
    } else if (paymentType === "financiado") {
      setValue("financed_amount", totalAmount || null);
      setValue("cash_method", null);
      setValue("cash_amount", null);
    } else if (paymentType === "mixto") {
      setValue("cash_amount", null);
      setValue("financed_amount", null);
    } else {
      setValue("cash_method", null);
      setValue("cash_amount", null);
      setValue("financer", null);
      setValue("financed_amount", null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType]);

  // Auto-calc financed_amount in mixto
  useEffect(() => {
    if (paymentType === "mixto" && totalAmount > 0 && cashAmount != null) {
      setValue("financed_amount", Math.max(0, totalAmount - cashAmount));
    }
  }, [paymentType, totalAmount, cashAmount, setValue]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Forma de pago
        </p>
        <div className="flex gap-2">
          {PAYMENT_TYPES.map((type) => {
            const Icon = PAYMENT_TYPE_ICONS[type];
            const active = paymentType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setValue("payment_type", type, { shouldValidate: true })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : error
                    ? "border-destructive/50 bg-background text-muted-foreground hover:border-destructive hover:text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {PAYMENT_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1">{error.message}</p>
        )}
      </div>

      {/* Contado section */}
      {(paymentType === "contado" || paymentType === "mixto") && (
        <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {paymentType === "mixto" ? "Parte en contado" : "Pago en contado"}
          </p>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Método</p>
            <div className="flex gap-2">
              {CASH_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setValue("cash_method", m, { shouldValidate: true })}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                    cashMethod === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : cashMethodError
                      ? "border-destructive/50 bg-background text-muted-foreground hover:border-destructive"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {CASH_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
            {cashMethodError && (
              <p className="text-xs text-destructive mt-1">{cashMethodError.message}</p>
            )}
          </div>
          {paymentType === "mixto" && (
            <Field>
              <FieldLabel>Importe contado (€)</FieldLabel>
              <Input
                type="number"
                min={0}
                max={totalAmount}
                step="0.01"
                {...register("cash_amount", { valueAsNumber: true })}
              />
            </Field>
          )}
          {paymentType === "contado" && totalAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground">
                {totalAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Financiado section */}
      {(paymentType === "financiado" || paymentType === "mixto") && (
        <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {paymentType === "mixto" ? "Parte financiada" : "Financiación"}
          </p>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Financiera</p>
            <div className="flex gap-2 flex-wrap">
              {FINANCERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setValue("financer", f, { shouldValidate: true })}
                  className={cn(
                    "flex items-center justify-center rounded-md border px-4 py-1.5 text-sm font-medium transition-all",
                    financer === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : financerError
                      ? "border-destructive/50 bg-background text-muted-foreground hover:border-destructive"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {FINANCER_LABELS[f]}
                </button>
              ))}
            </div>
            {financerError && (
              <p className="text-xs text-destructive mt-1">{financerError.message}</p>
            )}
          </div>
          {paymentType === "mixto" && cashAmount != null && totalAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              Importe financiado:{" "}
              <span className="font-semibold text-foreground">
                {Math.max(0, totalAmount - cashAmount).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </span>
            </p>
          )}
          {paymentType === "financiado" && totalAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              Total financiado:{" "}
              <span className="font-semibold text-foreground">
                {totalAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
