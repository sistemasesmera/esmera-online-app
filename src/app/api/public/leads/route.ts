import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LEAD_SOURCES = ["web", "meta_ads", "organico"] as const;

function authenticate(req: NextRequest): boolean {
  const key = process.env.PUBLIC_API_KEY;
  if (!key) return false;
  const auth = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === key;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^(\+34|0034)/, "");
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return Response.json({ error: "API key inválida o ausente" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { full_name, email, phone, source, interested_course, notes } = body;

  if (!full_name || typeof full_name !== "string" || !String(full_name).trim()) {
    return Response.json({ error: "full_name es requerido" }, { status: 422 });
  }
  if (!phone || typeof phone !== "string" || !String(phone).trim()) {
    return Response.json({ error: "phone es requerido" }, { status: 422 });
  }
  if (source && !LEAD_SOURCES.includes(source as typeof LEAD_SOURCES[number])) {
    return Response.json({ error: `source debe ser uno de: ${LEAD_SOURCES.join(", ")}` }, { status: 422 });
  }

  const cleanPhone = normalizePhone(String(phone).trim());
  const supabase = createAdminClient();

  // Check duplicate lead by phone
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, full_name, status")
    .eq("phone", cleanPhone)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingLead) {
    return Response.json(
      {
        error: "duplicate_lead",
        message: `Ya existe un lead con este teléfono (${existingLead.full_name}, estado: ${existingLead.status})`,
        existing_id: existingLead.id,
      },
      { status: 409 }
    );
  }

  // Check duplicate student by phone
  const { data: existingStudent } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("phone", cleanPhone)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingStudent) {
    return Response.json(
      {
        error: "already_student",
        message: `Este teléfono pertenece a un alumno ya registrado (${existingStudent.full_name})`,
        existing_id: existingStudent.id,
      },
      { status: 409 }
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
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, lead: data }, { status: 201 });
}
