import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "adjuntos";

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const [timestamp, signature] = header.split(".", 2);
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  try {
    return (
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const tag = "[webhook/docuseal]";

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error(tag, "Failed to read body:", err);
    return Response.json({ error: "bad_body" }, { status: 400 });
  }

  // Signature verification — log but never block production webhooks
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-docuseal-signature");
    const valid = verifySignature(rawBody, header, secret);
    if (!valid) {
      console.warn(tag, "Signature mismatch — header:", header?.slice(0, 40));
      // Return 401 only in strict mode; otherwise log and continue
      return Response.json({ error: "invalid_signature" }, { status: 401 });
    }
  } else {
    console.warn(tag, "DOCUSEAL_WEBHOOK_SECRET not set — skipping verification");
  }

  let payload: { event_type: string; data: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error(tag, "Invalid JSON body");
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { event_type, data } = payload;
  const submissionId = String((data as { id: number }).id);
  console.log(tag, "Received event:", event_type, "submission:", submissionId);

  // Check env vars
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(tag, "SUPABASE_SERVICE_ROLE_KEY is not set — cannot update DB");
    return Response.json({ received: true, warning: "no_service_key" });
  }

  const supabase = createAdminClient();

  if (event_type === "submission.completed") {
    const { data: contract, error: findError } = await supabase
      .from("contracts")
      .select("id, enrollment_id")
      .filter("docuseal_submission_id", "eq", submissionId)
      .single();

    if (findError || !contract) {
      console.error(tag, "Contract not found for submission:", submissionId, findError?.message);
      return Response.json({ received: true });
    }

    console.log(tag, "Found contract:", contract.id, "enrollment:", contract.enrollment_id);

    const d = data as {
      completed_at?: string;
      documents?: Array<{ name: string; url: string }>;
      submitters?: Array<{ documents?: Array<{ name: string; url: string }> }>;
    };

    // Try submission-level documents first, then submitter-level
    const docusealUrl =
      d.documents?.[0]?.url ??
      d.submitters?.[0]?.documents?.[0]?.url ??
      null;

    console.log(tag, "Signed PDF URL:", docusealUrl ? "present" : "missing");

    let finalDocumentUrl: string | null = docusealUrl;

    if (docusealUrl && contract.enrollment_id) {
      try {
        const pdfRes = await fetch(docusealUrl);
        if (pdfRes.ok) {
          const pdfBuffer = await pdfRes.arrayBuffer();
          const storagePath = `contracts/${contract.enrollment_id}/contrato-firmado.pdf`;

          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

          if (uploadErr) {
            console.error(tag, "Storage upload error:", uploadErr.message);
          } else {
            const { data: urlData } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
            if (urlData?.signedUrl) {
              finalDocumentUrl = urlData.signedUrl;
              console.log(tag, "PDF stored in Supabase Storage");
            }
          }
        } else {
          console.error(tag, "Failed to download PDF from DocuSeal:", pdfRes.status);
        }
      } catch (uploadErr) {
        console.error(tag, "Exception uploading PDF:", uploadErr);
      }
    }

    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        status: "firmado",
        document_url: finalDocumentUrl,
        signed_at: d.completed_at ?? new Date().toISOString(),
      } as never)
      .eq("id", contract.id);

    if (updateError) {
      console.error(tag, "DB update error:", updateError.message);
    } else {
      console.log(tag, "Contract updated to firmado");
    }

    if (contract.enrollment_id) {
      revalidatePath(`/enrollments/${contract.enrollment_id}`);
    }
  }

  if (event_type === "submission.expired") {
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, enrollment_id")
      .filter("docuseal_submission_id", "eq", submissionId)
      .single();

    if (contract) {
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: "borrador", docuseal_submission_id: null, sent_at: null } as never)
        .eq("id", contract.id);

      if (updateError) console.error(tag, "Expired update error:", updateError.message);
      if (contract.enrollment_id) revalidatePath(`/enrollments/${contract.enrollment_id}`);
    }
  }

  return Response.json({ received: true });
}
