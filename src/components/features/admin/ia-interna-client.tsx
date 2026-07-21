"use client";

import { Clock, Save, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveIAPrompt, type IAPromptRow } from "@/app/(app)/admin/ia-interna/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IAInternaClient({ prompts }: { prompts: IAPromptRow[] }) {
  const active = prompts.filter((p) => p.is_active);
  const upcoming = prompts.filter((p) => !p.is_active);

  return (
    <div className="space-y-8">
      {/* Active processes */}
      <div className="space-y-6">
        {active.map((p) => (
          <PromptEditor key={p.key} prompt={p} />
        ))}
      </div>

      {/* Upcoming processes */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Próximamente
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcoming.map((p) => (
              <div
                key={p.key}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 px-4 py-3.5 opacity-60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">En desarrollo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PromptEditor({ prompt }: { prompt: IAPromptRow }) {
  const [text, setText] = useState(prompt.prompt);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(val: string) {
    setText(val);
    setIsDirty(val !== prompt.prompt);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveIAPrompt(prompt.key, text);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Prompt guardado");
        setIsDirty(false);
      }
    });
  }

  const updatedAt = prompt.updated_at
    ? new Date(prompt.updated_at).toLocaleString("es-ES", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <Card className="card-shadow border">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{prompt.name}</CardTitle>
              {updatedAt && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Última edición: {updatedAt}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            disabled={!isDirty || isPending}
            onClick={handleSave}
            className="shrink-0"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground mb-2">
          Este texto se envía a la IA antes de los datos de leads. Puedes ajustar el tono,
          criterios de prioridad o añadir contexto del negocio.
        </p>
        <textarea
          className="w-full min-h-[260px] rounded-lg border border-input bg-muted/30 px-3 py-2.5 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          spellCheck={false}
        />
        {isDirty && (
          <p className="text-xs text-amber-600 mt-1.5 font-medium">
            Tienes cambios sin guardar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
