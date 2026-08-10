import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";

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
  if (isPreview) return true;
  if (!key) return false;
  const auth = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === key;
}

const CAPTURE_LEAD_TOOL = {
  type: "function" as const,
  function: {
    name: "capture_lead",
    description:
      "Llama a esta función en cuanto el usuario haya proporcionado su nombre completo y número de teléfono para que un comercial le contacte.",
    parameters: {
      type: "object",
      properties: {
        full_name:         { type: "string", description: "Nombre completo del usuario" },
        phone:             { type: "string", description: "Número de teléfono del usuario" },
        interested_course: { type: "string", description: "Curso en el que está interesado, si lo mencionó" },
        email:             { type: "string", description: "Email del usuario, si lo mencionó" },
      },
      required: ["full_name", "phone"],
    },
  },
};

const LEAD_CAPTURE_INSTRUCTION =
  "\n\nCUANDO EL USUARIO MUESTRE INTERÉS: pídele su nombre completo y teléfono para que un comercial de Esmera le contacte sin compromiso. En cuanto los tengas, llama a la función capture_lead. Tras hacerlo, confirma que el equipo se pondrá en contacto pronto.";

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

  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  const isPreview = body.preview === true;

  const supabase = createAdminClient();
  const { data: config } = await supabase.from("agent_config").select("*").single();

  if (!config) {
    return Response.json({ error: "Agente no configurado" }, { status: 503, headers: CORS_HEADERS });
  }

  const overrides = (body.overrides ?? {}) as Partial<typeof config>;
  const effectiveConfig = isPreview ? { ...config, ...overrides } : config;

  if (!isPreview && !effectiveConfig.is_active) {
    return Response.json({ error: "El agente no está activo" }, { status: 503, headers: CORS_HEADERS });
  }

  // Upsert conversation session
  let conversationId: string | null = null;
  if (!isPreview && sessionId) {
    const { data: existingConv } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from("agent_conversations")
        .insert({ session_id: sessionId, messages: [] })
        .select("id")
        .single();
      if (newConv) conversationId = newConv.id;
    }
  }

  // Build dynamic courses catalog from DB grouped by category
  const { data: activeCourses } = await supabase
    .from("courses")
    .select("name, code, duration_hours, price, category")
    .eq("is_active", true)
    .order("category")
    .order("name");

  let coursesCatalog = "";
  if (activeCourses && activeCourses.length > 0) {
    const grouped = new Map<string, typeof activeCourses>();
    for (const c of activeCourses) {
      const cat = c.category?.trim() || "Otros";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(c);
    }
    const sections: string[] = [];
    for (const [cat, items] of grouped) {
      const lines = items.map((c) => {
        const price = c.price != null ? `${Number(c.price).toLocaleString("es-ES")} €` : "consultar precio";
        const hours = c.duration_hours != null ? ` (${c.duration_hours}h)` : "";
        return `  - ${c.name}${hours}: ${price}`;
      });
      sections.push(`${cat}:\n${lines.join("\n")}`);
    }
    coursesCatalog = `\n\nCATÁLOGO DE CURSOS DISPONIBLES (actualizado en tiempo real):\n${sections.join("\n\n")}`;
  }

  const systemParts: string[] = [];
  if (effectiveConfig.system_prompt) systemParts.push(effectiveConfig.system_prompt);
  if (effectiveConfig.knowledge) systemParts.push(`\n\nCONOCIMIENTO BASE:\n${effectiveConfig.knowledge}`);
  if (coursesCatalog) systemParts.push(coursesCatalog);
  if (!isPreview) systemParts.push(LEAD_CAPTURE_INSTRUCTION);
  const systemPrompt = systemParts.join("") || "Eres un asistente virtual útil y amable.";

  const openaiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-20),
  ];

  try {
    const reqBody: Record<string, unknown> = {
      model: effectiveConfig.model ?? "gpt-4o-mini",
      messages: openaiMessages,
      max_tokens: 500,
      temperature: 0.7,
      tools: [CAPTURE_LEAD_TOOL],
      tool_choice: "auto",
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        { error: (err as { error?: { message?: string } }).error?.message ?? "Error de OpenAI" },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const data = await res.json() as {
      choices: {
        message: {
          content: string | null;
          tool_calls?: { function: { name: string; arguments: string } }[];
        };
      }[];
    };

    const choice = data.choices[0]?.message;
    let replyText = choice?.content ?? "";
    let leadCaptured = false;

    // Handle capture_lead function call
    const call = choice?.tool_calls?.find((t) => t.function.name === "capture_lead");
    if (call && !isPreview) {
      try {
        const args = JSON.parse(call.function.arguments) as {
          full_name: string;
          phone: string;
          interested_course?: string;
          email?: string;
        };

        const tag = "[chat/capture_lead]";
        console.log(tag, "args:", JSON.stringify(args));

        const cleanPhone = normalizePhone(args.phone);
        console.log(tag, "cleanPhone:", cleanPhone);

        const [{ data: existingLead, error: leadErr }, { data: existingStudent, error: studentErr }] = await Promise.all([
          supabase.from("leads").select("id, status").eq("phone", cleanPhone).maybeSingle(),
          supabase.from("students").select("id").eq("phone", cleanPhone).is("deleted_at", null).maybeSingle(),
        ]);

        if (leadErr) console.error(tag, "Error checking lead:", leadErr.message);
        if (studentErr) console.error(tag, "Error checking student:", studentErr.message);
        console.log(tag, "existingLead:", existingLead, "existingStudent:", existingStudent);

        if (!existingStudent) {
          if (existingLead) {
            if (existingLead.status === "descartado") {
              const { error: updErr } = await supabase.from("leads").update({
                full_name: args.full_name,
                status: "nuevo",
                interested_course: args.interested_course ?? null,
                updated_at: new Date().toISOString(),
              }).eq("id", existingLead.id);
              if (updErr) console.error(tag, "Error reactivating lead:", updErr.message);
              else console.log(tag, "Lead reactivated:", existingLead.id);
            } else {
              console.log(tag, "Lead already active — skipping insert:", existingLead.id);
            }
          } else {
            const { data: newLead, error: insErr } = await supabase.from("leads").insert({
              full_name: args.full_name,
              phone: cleanPhone,
              email: args.email ?? null,
              source: "agente_web",
              status: "nuevo",
              interested_course: args.interested_course ?? null,
            }).select("id").single();

            if (insErr) {
              console.error(tag, "Error inserting lead:", insErr.message, insErr.details, insErr.hint);
            } else {
              console.log(tag, "Lead created:", newLead?.id);
            }
          }
        } else {
          console.log(tag, "Phone belongs to existing student — skipping");
        }

        leadCaptured = true;

        if (!replyText) {
          const firstName = args.full_name.split(" ")[0];
          replyText = `¡Perfecto, ${firstName}! He registrado tus datos. Un comercial de Esmera se pondrá en contacto contigo lo antes posible. ¿Puedo ayudarte con algo más?`;
        }
      } catch (e) {
        console.error("[chat/capture_lead] Unexpected error:", e);
        replyText = replyText || "Gracias por tu interés. El equipo se pondrá en contacto contigo pronto.";
      }
    }

    // Save conversation messages
    if (!isPreview && conversationId) {
      const updatedMessages = messages.concat(replyText ? [{ role: "assistant", content: replyText }] : []);
      const now = new Date().toISOString();

      if (leadCaptured) {
        const capCall = choice?.tool_calls?.find((t) => t.function.name === "capture_lead");
        if (capCall) {
          try {
            const a = JSON.parse(capCall.function.arguments) as { full_name: string; phone: string };
            await supabase.from("agent_conversations").update({
              messages: updatedMessages as unknown as import("@/types/database.types").Json,
              updated_at: now,
              visitor_name: a.full_name,
              visitor_phone: normalizePhone(a.phone),
              lead_captured_at: now,
            }).eq("id", conversationId);
          } catch {
            await supabase.from("agent_conversations").update({
              messages: updatedMessages as unknown as import("@/types/database.types").Json,
              updated_at: now,
            }).eq("id", conversationId);
          }
        } else {
          await supabase.from("agent_conversations").update({
            messages: updatedMessages as unknown as import("@/types/database.types").Json,
            updated_at: now,
          }).eq("id", conversationId);
        }
      } else {
        await supabase.from("agent_conversations").update({
          messages: updatedMessages as unknown as import("@/types/database.types").Json,
          updated_at: now,
        }).eq("id", conversationId);
      }
    }

    return Response.json({ message: replyText, lead_captured: leadCaptured }, { status: 200, headers: CORS_HEADERS });
  } catch {
    return Response.json({ error: "Error al conectar con OpenAI" }, { status: 502, headers: CORS_HEADERS });
  }
}
