"use client";

import { Bot, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getDailyBriefing, regenerateDailyBriefing } from "@/app/(app)/crm/leads/daily-briefing-action";

export function DailyBriefing({ initialContent }: { initialContent: string | null }) {
  const [content, setContent] = useState<string | null>(initialContent);
  const [isLoading, setIsLoading] = useState(!initialContent);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (initialContent || hasFetched.current) return;
    hasFetched.current = true;

    setIsLoading(true);
    getDailyBriefing().then((result) => {
      setIsLoading(false);
      if (result.error) {
        toast.error("No se pudo generar el briefing: " + result.error);
        return;
      }
      setContent(result.content);
    });
  }, [initialContent]);

  async function handleRegenerate() {
    setIsRegenerating(true);
    const result = await regenerateDailyBriefing();
    setIsRegenerating(false);
    if (result.error) {
      toast.error("Error al regenerar: " + result.error);
      return;
    }
    setContent(result.content);
    setIsCollapsed(false);
    toast.success("Briefing actualizado");
  }

  if (!isLoading && !content) return null;

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
            {!isLoading && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                Generado por IA · {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isLoading && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              title="Regenerar briefing"
              className="rounded-md p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            </button>
          )}
          {!isLoading && (
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
          {isLoading ? (
            <div className="flex items-center gap-2.5 py-2">
              <Bot className="h-4 w-4 text-indigo-400 animate-pulse shrink-0" />
              <p className="text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
                Analizando tus leads y preparando tu plan de hoy…
              </p>
            </div>
          ) : (
            <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed whitespace-pre-line">
              {content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
