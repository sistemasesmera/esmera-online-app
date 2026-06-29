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

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fontFamily = tryRegisterMontserrat();

    let logoBase64: string | null = null;
    try {
      logoBase64 = fs.readFileSync(path.join(process.cwd(), "public", "esmera-logo.png")).toString("base64");
    } catch { /* logo opcional */ }

    const contractData: EnrollmentContractData = {
      enrollment_number: null,
      enrollment_date:   new Date().toISOString(),
      start_date:        null,
      end_date:          null,
      duration_months:   null,
      student:           null,
      course:            null,
      platform:          null,
      contract:          null,
      generatedAt:       new Date().toISOString(),
      logoBase64,
      fontFamily,
    };

    const pdfBuffer = await renderToBuffer(
      <EnrollmentContractPDF data={contractData} />
    );

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrato-en-blanco.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[contracts/blank] PDF generation error:", err);
    return Response.json({ error: "Error generating PDF" }, { status: 500 });
  }
}
