import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";

const LEAD_SOURCES = ["web", "meta_ads", "organico"] as const;

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
  if (!key) return false;
  const auth = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === key;
}


export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return Response.json({ error: "API key inválida o ausente" }, { status: 401, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400, headers: CORS_HEADERS });
  }

  const { full_name, email, phone, source, interested_course, notes } = body;

  if (!full_name || typeof full_name !== "string" || !String(full_name).trim()) {
    return Response.json({ error: "full_name es requerido" }, { status: 422, headers: CORS_HEADERS });
  }
  if (!phone || typeof phone !== "string" || !String(phone).trim()) {
    return Response.json({ error: "phone es requerido" }, { status: 422, headers: CORS_HEADERS });
  }
  if (source && !LEAD_SOURCES.includes(source as typeof LEAD_SOURCES[number])) {
    return Response.json({ error: `source debe ser uno de: ${LEAD_SOURCES.join(", ")}` }, { status: 422, headers: CORS_HEADERS });
  }

  const cleanPhone = normalizePhone(String(phone).trim());
  const supabase = createAdminClient();

  // Check duplicate lead by phone
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (existingLead) {
    return Response.json(
      { error: "duplicate_lead", message: "Este teléfono ya está registrado." },
      { status: 409, headers: CORS_HEADERS }
    );
  }

  // Check duplicate student by phone
  const { data: existingStudent } = await supabase
    .from("students")
    .select("id")
    .eq("phone", cleanPhone)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingStudent) {
    return Response.json(
      { error: "already_student", message: "Este teléfono ya está registrado." },
      { status: 409, headers: CORS_HEADERS }
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: String(full_name).trim(),
      email:     email ? String(email).trim() : null,
      phone:     cleanPhone,
      source:    (source as typeof LEAD_SOURCES[number]) ?? "web",
      status:    "nuevo",
      interested_course: interested_course ? String(interested_course).trim() : null,
      notes:     notes ? String(notes).trim() : null,
    })
    .select("id, full_name, email, phone, source, status, interested_course, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return Response.json({ ok: true, lead: data }, { status: 201, headers: CORS_HEADERS });
}
