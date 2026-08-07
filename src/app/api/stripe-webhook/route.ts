import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Firma o webhook secret ausente" }, { status: 400 });
  }

  // Raw body required for Stripe signature verification — do not call req.json()
  let body: string;
  let event: Stripe.Event;

  try {
    body = await req.text();
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("[stripe-webhook] Firma inválida:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const customerName  = session.customer_details?.name?.trim()  ?? "";
  const customerEmail = session.customer_details?.email?.trim() ?? "";

  console.log("[stripe-webhook] customer_details:", JSON.stringify(session.customer_details));
  console.log("[stripe-webhook] custom_fields:", JSON.stringify(session.custom_fields));

  // Native phone field OR custom field (Payment Link custom fields)
  const customPhoneField = (session.custom_fields ?? []).find((f) =>
    /phone|telefon|tel|movil|móvil/i.test(f.key)
  );
  const customPhoneValue =
    customPhoneField?.type === "text"    ? (customPhoneField.text?.value ?? null) :
    customPhoneField?.type === "numeric" ? (customPhoneField.numeric?.value ?? null) :
    null;
  const customerPhone = session.customer_details?.phone ?? customPhoneValue;
  console.log("[stripe-webhook] customPhoneField key:", customPhoneField?.key, "| customerPhone:", customerPhone);
  const amountPaid    = session.amount_total != null ? session.amount_total / 100 : 0;
  const currency      = (session.currency ?? "eur").toUpperCase();

  if (!customerEmail) {
    console.error("[stripe-webhook] Sesión sin email:", session.id);
    return NextResponse.json({ error: "No hay email del cliente" }, { status: 422 });
  }

  // course_id puede venir de session.metadata (Astro server-side) o del producto de Stripe
  let courseId: string | null   = session.metadata?.course_id   ?? null;
  let courseCode: string | null = session.metadata?.course_code ?? null;

  if (!courseId && !courseCode) {
    const fullSession = await getStripe().checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price.product"],
    });
    const product = fullSession.line_items?.data[0]?.price?.product as Stripe.Product | null;
    courseId   = product?.metadata?.course_id   ?? null;
    courseCode = product?.metadata?.course_code ?? null;
  }

  if (!courseId && !courseCode) {
    console.error("[stripe-webhook] Sin course_id en metadata de sesión ni de producto:", session.id);
    return NextResponse.json(
      { error: "Falta course_id en metadata del producto o de la sesión" },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  // Idempotencia: Stripe puede reenviar el mismo evento
  const { data: duplicate } = await supabase
    .from("enrollments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Buscar curso
  const coursesTable = supabase.from("courses");
  const courseQuery = courseId
    ? coursesTable.select("id").eq("is_active", true).eq("id", courseId)
    : coursesTable.select("id").eq("is_active", true).eq("code", courseCode!);
  const { data: course, error: courseError } = await courseQuery.maybeSingle();

  if (courseError || !course) {
    console.error("[stripe-webhook] Curso no encontrado:", { courseId, courseCode, error: courseError });
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 422 });
  }

  // Buscar o crear alumno por email
  const { data: existingStudent } = await supabase
    .from("students")
    .select("id, phone")
    .eq("email", customerEmail)
    .is("deleted_at", null)
    .maybeSingle();

  let studentId: string;

  if (existingStudent) {
    studentId = existingStudent.id;
    // Update phone if missing
    if (customerPhone && !existingStudent.phone) {
      await supabase
        .from("students")
        .update({ phone: normalizePhone(customerPhone) })
        .eq("id", studentId);
    }
  } else {
    const nameParts = customerName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0]              || customerEmail;
    const lastName  = nameParts.slice(1).join(" ") || firstName;

    const { data: newStudent, error: studentError } = await supabase
      .from("students")
      .insert({
        full_name:  customerName || customerEmail,
        first_name: firstName,
        last_name:  lastName,
        email:      customerEmail,
        phone:      customerPhone ? normalizePhone(customerPhone) : null,
        status:     "en_formacion",
      })
      .select("id")
      .single();

    if (studentError || !newStudent) {
      console.error("[stripe-webhook] Error al crear alumno:", studentError);
      return NextResponse.json({ error: "Error al crear alumno" }, { status: 500 });
    }

    studentId = newStudent.id;
  }

  // Crear matrícula en pendiente_validar para que administración llame al alumno
  const { error: enrollmentError } = await supabase
    .from("enrollments")
    .insert({
      student_id:        studentId,
      course_id:         course.id,
      status:            "pendiente_validar",
      source:            "web_checkout",
      stripe_session_id: session.id,
      notes:             `Compra web. Stripe session: ${session.id}. Importe: ${amountPaid.toFixed(2)} ${currency}`,
    });

  if (enrollmentError) {
    console.error("[stripe-webhook] Error al crear matrícula:", enrollmentError);
    return NextResponse.json({ error: "Error al crear matrícula" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
