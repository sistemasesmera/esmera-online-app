"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInWithPassword } from "./actions";

const loginSchema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Email no válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const result = await signInWithPassword(values);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      {/* Brand mark */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg mb-4">
          <span className="text-xl font-black text-primary-foreground tracking-tighter">E</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Esmera Online Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">Plataforma de gestión académica</p>
      </div>

      <Card className="card-shadow-md border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Iniciar sesión</CardTitle>
          <CardDescription className="text-sm">Accede con tu cuenta institucional</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
                <FieldError errors={[errors.password]} />
              </Field>
              {formError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-semibold">
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
