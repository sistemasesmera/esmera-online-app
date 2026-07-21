"use client";

import { AlertCircle, Bot, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getDailyBriefing, regenerateDailyBriefing } from "@/app/(app)/crm/leads/daily-briefing-action";
import { Button } from "@/components/ui/button";

type State = "idle" | "loading" | "done" | "error";

export function DailyBriefing({
  initialContent,
  userRole,
}: {
  initialContent: string | null;
  userRole: string;
}) {
  const [content, setContent] = useState<string | null>(initialContent);
  const [state, setState] = useState<State>(initialContent ? "done" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasFetched = useRef(false);

  // Auto-trigger on first mount if no content yet
  useEffect(() => {
    if (initialContent || hasFetched.current) return;
    hasFetched.current = true;
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setState("loading");
    setErrorMsg(null);
    const result = await getDailyBriefing();
    if (result.error) {
      setState("error");
      setErrorMsg(result.error);
      return;
    }
    if (!result.content) {
      setState("error");
      setErrorMsg("No se recibió contenido del servidor.");
      return;
    }
    setContent(result.content);
    setState("done");
    setIsCollapsed(false);
  }

  async function handleRegenerate() {
    setState("loading");
    setErrorMsg(null);
    const result = await regenerateDailyBriefing();
    if (result.error) {
      setState("error");
      setErrorMsg(result.error);
      return;
    }
    if (!result.content) {
      setState("error");
      setErrorMsg("No se recibió contenido del servidor.");
      return;
    }
    setContent(result.content);
    setState("done");
    setIsCollapsed(false);
  }

  const dateLabel = new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
              Tu briefing de hoy
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 capitalize">
              {dateLabel} · {userRole === "jefe_comercial" ? "equipo completo" : "mis leads"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {state === "done" && (
            <button
              onClick={handleRegenerate}
              title="Regenerar briefing"
              className="rounded-md p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {state === "done" && (
            <button
              onClick={() => setIsCollapsed((v) => !v)}
              className="rounded-md p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {state === "loading" && (
            <div className="flex items-center gap-2.5 py-1">
              <Bot className="h-4 w-4 text-indigo-400 animate-pulse shrink-0" />
              <p className="text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                Analizando tus leads y preparando tu plan de hoy…
              </p>
            </div>
          )}

          {state === "idle" && (
            <div className="flex items-center gap-3 py-1">
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Genera tu resumen de gestión para hoy.
              </p>
              <Button size="sm" onClick={generate} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white">
                Generar briefing
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-start gap-2.5 py-1">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {errorMsg ?? "Error al generar el briefing."}
                </p>
                <button
                  onClick={generate}
                  className="mt-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {state === "done" && content && (
            <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed whitespace-pre-line">
              {content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
