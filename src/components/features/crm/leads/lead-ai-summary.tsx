"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { summarizeLead } from "@/app/(app)/crm/leads/[id]/ai-summary-action";

export function LeadAISummary({ leadId }: { leadId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSummarize() {
    setError(null);
    startTransition(async () => {
      const result = await summarizeLead(leadId);
      if (result.error) setError(result.error);
      else setSummary(result.summary);
    });
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600">Resumen IA</span>
        </div>
        <button
          onClick={handleSummarize}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              Analizando…
            </>
          ) : summary ? (
            <>
              <RefreshCw className="h-3 w-3" />
              Regenerar
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Generar resumen
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="px-4 pb-3 text-xs text-destructive border-t border-indigo-100 pt-2">{error}</p>
      )}

      {summary && !error && (
        <p className="px-4 pb-3 text-sm text-foreground/80 leading-relaxed border-t border-indigo-100 pt-2.5">
          {summary}
        </p>
      )}
    </div>
  );
}
