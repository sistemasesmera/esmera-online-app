"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { analyzeLeadsWithAI, type AISuggestion } from "@/app/(app)/crm/leads/ai-actions";
import { Button } from "@/components/ui/button";

const ACTION_ICONS: Record<AISuggestion["action_type"], React.ElementType> = {
  llamada:     Phone,
  whatsapp:    MessageCircle,
  email:       Mail,
  seguimiento: Sparkles,
};

const PRIORITY_DOT: Record<AISuggestion["priority"], string> = {
  alta:  "bg-red-500",
  media: "bg-amber-400",
  baja:  "bg-emerald-500",
};

const PRIORITY_LABEL: Record<AISuggestion["priority"], string> = {
  alta:  "ALTA",
  media: "MEDIA",
  baja:  "BAJA",
};

const PRIORITY_BADGE: Record<AISuggestion["priority"], string> = {
  alta:  "bg-red-50 border-red-200 text-red-700",
  media: "bg-amber-50 border-amber-200 text-amber-700",
  baja:  "bg-emerald-50 border-emerald-200 text-emerald-700",
};

export function LeadAISuggestions() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setError(null);
    startTransition(async () => {
      const result = await analyzeLeadsWithAI();
      if (result.error) {
        setError(result.error);
      } else {
        setSuggestions(result.suggestions);
        setAnalyzed(true);
        setCollapsed(false);
      }
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">IA Interna</span>
          <span className="text-xs text-indigo-400">·</span>
          <span className="text-xs text-indigo-500">Análisis de seguimiento</span>
          {analyzed && suggestions.length > 0 && (
            <span className="ml-1 text-[10px] font-bold rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 px-2 py-0.5">
              {suggestions.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {analyzed && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {collapsed ? "Ver" : "Ocultar"}
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400"
            onClick={handleAnalyze}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                Analizando…
              </>
            ) : analyzed ? (
              <>
                <RefreshCw className="h-3 w-3" />
                Re-analizar
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Analizar leads
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3 text-sm text-destructive border-t border-indigo-100 pt-3">
          {error}
        </div>
      )}

      {/* Empty */}
      {analyzed && !collapsed && !error && suggestions.length === 0 && (
        <div className="border-t border-indigo-100 px-4 py-3 text-sm text-muted-foreground">
          No se encontraron leads urgentes. ¡Todo bajo control!
        </div>
      )}

      {/* Suggestions list */}
      {analyzed && !collapsed && suggestions.length > 0 && (
        <div className="border-t border-indigo-100 divide-y divide-indigo-100/50">
          {suggestions.map((s) => {
            const Icon = ACTION_ICONS[s.action_type];
            return (
              <Link
                key={s.lead_id}
                href={`/crm/leads/${s.lead_id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/80 transition-colors group"
              >
                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-black tracking-wide shrink-0 ${PRIORITY_BADGE[s.priority]}`}>
                  {PRIORITY_LABEL[s.priority]}
                </span>
                <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span className="min-w-0 text-sm">
                  <span className="font-semibold text-foreground">{s.lead_name}</span>
                  <span className="text-muted-foreground"> — {s.message}</span>
                </span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-indigo-300 group-hover:text-indigo-500 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
