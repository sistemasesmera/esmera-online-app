import "server-only";
import {
  fetchGhlPipelines,
  fetchGhlOpportunities,
  fetchGhlOpportunity,
  fetchGhlContactNotes,
  fetchGhlContactCustomFieldValue,
  type GhlPipeline,
  type GhlPipelineStage,
  type GhlOpportunity,
  type GhlNote,
} from "@/lib/ghl/api";

export type { GhlPipeline, GhlPipelineStage, GhlOpportunity, GhlNote };
export { fetchGhlOpportunity, fetchGhlContactNotes };

// GhlOpportunity enriquecida con campos extra del contacto
export type GhlOpportunityEnriched = GhlOpportunity & {
  cursoValue: string | null;
};

export type GhlPipelineData = {
  pipelines: GhlPipeline[];
  opportunitiesByPipeline: Record<string, GhlOpportunityEnriched[]>;
};

async function enrichWithCurso(opps: GhlOpportunity[]): Promise<GhlOpportunityEnriched[]> {
  const fieldId = process.env.GHL_CURSO_FIELD_ID;
  if (!fieldId || opps.length === 0) return opps.map((o) => ({ ...o, cursoValue: null }));

  // Batch-fetch en paralelo (sin agrupar por contacto único — contactIds pueden repetirse)
  const uniqueContactIds = [...new Set(opps.map((o) => o.contact.id))];
  const valueByContactId = new Map<string, string | null>();

  await Promise.all(
    uniqueContactIds.map(async (contactId) => {
      const value = await fetchGhlContactCustomFieldValue(contactId, fieldId);
      valueByContactId.set(contactId, value);
    })
  );

  return opps.map((o) => ({
    ...o,
    cursoValue: valueByContactId.get(o.contact.id) ?? null,
  }));
}

export async function fetchGhlOpportunityEnriched(id: string): Promise<GhlOpportunityEnriched | null> {
  const opp = await fetchGhlOpportunity(id);
  if (!opp) return null;
  const [enriched] = await enrichWithCurso([opp]);
  return enriched;
}

export async function fetchPipelineData(): Promise<GhlPipelineData> {
  const pipelines = await fetchGhlPipelines();

  const entries = await Promise.all(
    pipelines.map(async (p) => {
      const opps = await fetchGhlOpportunities(p.id);
      const enriched = await enrichWithCurso(opps);
      return [p.id, enriched] as const;
    })
  );

  return {
    pipelines,
    opportunitiesByPipeline: Object.fromEntries(entries),
  };
}
