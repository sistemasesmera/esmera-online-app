"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInWithPassword } from "./actions";

const QUOTES = [
  { text: "Cada alumno que avanza es un logro de todo el equipo.", author: "Equipo Esmera" },
  { text: "La excelencia no es un destino, es una forma de trabajar cada día.", author: "Equipo Esmera" },
  { text: "Juntos construimos el futuro de nuestros estudiantes.", author: "Equipo Esmera" },
  { text: "Tu dedicación hace posible el éxito de nuestros alumnos.", author: "Equipo Esmera" },
  { text: "Cada matrícula es una historia de superación que empieza aquí.", author: "Equipo Esmera" },
  { text: "El compromiso de hoy forma a los profesionales de mañana.", author: "Equipo Esmera" },
  { text: "Esmera: donde la formación se convierte en transformación.", author: "Equipo Esmera" },
];

const loginSchema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Email no válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function jumpToQuote(i: number) {
    setQuoteVisible(false);
    setTimeout(() => { setQuoteIndex(i); setQuoteVisible(true); }, 350);
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const result = await signInWithPassword(values);
    if (result.error) { setFormError(result.error); return; }
    router.push("/dashboard");
    router.refresh();
  }

  const quote = QUOTES[quoteIndex];

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left panel: image + quotes ── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-3/5 relative flex-col justify-between p-12 overflow-hidden"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&q=85&w=1400&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-indigo-900/80 to-violet-900/70" />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
              <span className="text-lg font-black text-white tracking-tighter">E</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              Esmera Online Manager
            </span>
          </div>
        </div>

        {/* Quote block */}
        <div className="relative z-10 max-w-md">
          <div
            className="transition-opacity duration-300"
            style={{ opacity: quoteVisible ? 1 : 0 }}
          >
            <div className="text-indigo-300/80 text-5xl font-serif leading-none mb-4 select-none">"</div>
            <blockquote className="text-white text-xl font-light leading-relaxed">
              {quote.text}
            </blockquote>
            <p className="text-indigo-300 text-sm font-medium tracking-widest uppercase mt-5">
              — {quote.author}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-8">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => jumpToQuote(i)}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  i === quoteIndex ? "w-6 bg-white" : "w-2 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Brand (mobile only) */}
        <div className="lg:hidden flex flex-col items-center mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg mb-3">
            <span className="text-xl font-black text-primary-foreground tracking-tighter">E</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Esmera Online Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Plataforma de gestión académica</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Bienvenido de nuevo
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Accede con tu cuenta institucional para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@esmeraschool.com"
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              {formError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 font-semibold text-sm mt-1"
              >
                {isSubmitting ? "Entrando…" : "Iniciar sesión"}
              </Button>
            </FieldGroup>
          </form>

          <p className="text-center text-xs text-muted-foreground/50 mt-10">
            © 2026 Esmera School · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
