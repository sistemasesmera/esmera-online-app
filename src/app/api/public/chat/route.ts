import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function authenticate(req: NextRequest): boolean {
  const key = process.env.PUBLIC_API_KEY;
  const isPreview = req.headers.get("x-api-key") === "preview-internal";
  if (isPreview) return true; // internal preview from admin panel
  if (!key) return false;
  const auth = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === key;
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return Response.json({ error: "API key inválida o ausente" }, { status: 401, headers: CORS_HEADERS });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY no configurada" }, { status: 503, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400, headers: CORS_HEADERS });
  }

  const messages = body.messages as { role: string; content: string }[] | undefined;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages es requerido" }, { status: 422, headers: CORS_HEADERS });
  }

  const supabase = createAdminClient();
  const { data: config } = await supabase.from("agent_config").select("*").single();

  if (!config) {
    return Response.json({ error: "Agente no configurado" }, { status: 503, headers: CORS_HEADERS });
  }

  // Allow preview to override config without saving
  const isPreview = body.preview === true;
  const overrides = (body.overrides ?? {}) as Partial<typeof config>;
  const effectiveConfig = isPreview ? { ...config, ...overrides } : config;

  if (!isPreview && !effectiveConfig.is_active) {
    return Response.json({ error: "El agente no está activo" }, { status: 503, headers: CORS_HEADERS });
  }

  const systemParts: string[] = [];
  if (effectiveConfig.system_prompt) systemParts.push(effectiveConfig.system_prompt);
  if (effectiveConfig.knowledge) systemParts.push(`\n\nCONOCIMIENTO BASE:\n${effectiveConfig.knowledge}`);
  const systemPrompt = systemParts.join("") || "Eres un asistente virtual útil y amable.";

  const openaiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-20), // keep last 20 messages to avoid token overflow
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveConfig.model ?? "gpt-4o-mini",
        messages: openaiMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: (err as { error?: { message?: string } }).error?.message ?? "Error de OpenAI" }, { status: 502, headers: CORS_HEADERS });
    }

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const message = data.choices[0]?.message?.content ?? "";

    return Response.json({ message }, { status: 200, headers: CORS_HEADERS });
  } catch {
    return Response.json({ error: "Error al conectar con OpenAI" }, { status: 502, headers: CORS_HEADERS });
  }
}
