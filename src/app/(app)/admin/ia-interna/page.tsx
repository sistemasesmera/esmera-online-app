import type { Metadata } from "next";
export const metadata: Metadata = { title: "IA Interna" };

import { Bot, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IAInternaPage() {
  const user = await getCurrentUser();
  if (!user || !["tech", "jefe_comercial"].includes(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200">
            <Bot className="h-5 w-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">IA Interna</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Procesos de inteligencia artificial para optimizar la gestión del equipo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Proceso: Análisis de Leads */}
        <Link href="/crm/leads" className="group">
          <Card className="card-shadow border h-full hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/60 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5">
                  Activo
                </span>
              </div>
              <CardTitle className="text-sm font-semibold mt-2">
                Análisis de Leads CRM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Analiza todos los leads activos y su historial de contactos para identificar
                quién necesita seguimiento urgente y qué acción tomar.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Priorización", "Seguimiento", "Acciones"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs font-semibold text-indigo-600 group-hover:underline">
                Ir al módulo de Leads →
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Placeholder — próximamente */}
        <div className="rounded-xl border border-dashed border-border/60 p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[180px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Próximamente</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Más procesos en desarrollo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
