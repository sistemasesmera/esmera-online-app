import React from "react";
import fs from "fs";
import path from "path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  EnrollmentContractPDF,
  type EnrollmentContractData,
} from "@/lib/pdf/enrollment-contract";

let montserratRegistered = false;

function tryRegisterMontserrat(): string {
  if (montserratRegistered) return "Montserrat";
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const regularPath = path.join(fontsDir, "Montserrat-Regular.ttf");
    const boldPath    = path.join(fontsDir, "Montserrat-Bold.ttf");
    if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) return "Helvetica";
    Font.register({
      family: "Montserrat",
      fonts: [
        { src: regularPath, fontWeight: 400 },
        { src: boldPath,    fontWeight: 700 },
      ],
    });
    montserratRegistered = true;
    return "Montserrat";
  } catch {
    return "Helvetica";
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blank = req.nextUrl.searchParams.get("blank") === "true";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .select(`
        id, enrollment_number, enrollment_date, start_date, end_date, duration_months,
        students!student_id(full_name, dni_nie, birth_date, email, phone, address, province, postal_code),
        courses!course_id(name, duration_hours),
        platforms!platform_id(name),
        contracts!enrollment_id(amount, payment_type, cash_method, cash_amount, financer, financed_amount)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !enrollment) {
      return Response.json({ error: "Enrollment not found" }, { status: 404 });
    }

    const raw = enrollment as unknown as {
      id: string;
      enrollment_number: number;
      enrollment_date: string;
      start_date: string | null;
      end_date: string | null;
      duration_months: number | null;
      students: {
        full_name: string;
        dni_nie: string;
        birth_date: string | null;
        email: string;
        phone: string | null;
        address: string | null;
        province: string | null;
        postal_code: string | null;
      } | null;
      courses: { name: string; duration_hours: number | null } | null;
      platforms: { name: string } | null;
      contracts: Array<{
        amount: number;
        payment_type: string | null;
        cash_method: string | null;
        cash_amount: number | null;
        financer: string | null;
        financed_amount: number | null;
      }>;
    };

    const activeContract = Array.isArray(raw.contracts) ? raw.contracts[0] ?? null : null;
    const generatedAt   = new Date().toISOString();
    const fontFamily    = tryRegisterMontserrat();

    let logoBase64: string | null = null;
    try {
      logoBase64 = fs.readFileSync(path.join(process.cwd(), "public", "esmera-logo.png")).toString("base64");
    } catch { /* logo opcional */ }

    const contractData: EnrollmentContractData = {
      enrollment_number: raw.enrollment_number,
      enrollment_date:   raw.enrollment_date,
      start_date:        blank ? null : raw.start_date,
      end_date:          blank ? null : raw.end_date,
      duration_months:   blank ? null : raw.duration_months,
      student:           blank ? null : (raw.students ?? null),
      course:            blank ? null : (raw.courses  ?? null),
      platform:          blank ? null : (raw.platforms?.name ?? null),
      contract:          blank ? null : activeContract,
      generatedAt,
      logoBase64,
      fontFamily,
    };

    const pdfBuffer = await renderToBuffer(
      <EnrollmentContractPDF data={contractData} />
    );

    const filename = blank
      ? `contrato-en-blanco-${raw.enrollment_number}.pdf`
      : `matricula-${raw.enrollment_number}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[contract/route] PDF generation error:", err);
    return Response.json({ error: "Error generating PDF" }, { status: 500 });
  }
}
