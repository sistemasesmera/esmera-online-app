import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  return Response.json({ ok: true, route: "/api/webhooks/docuseal", status: "reachable" });
}

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

  // Verify signature — log mismatch but always process (DocuSeal may show OK on 4xx)
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-docuseal-signature");
    if (!verifySignature(rawBody, header, secret)) {
      console.warn(tag, "Signature mismatch — continuing anyway. Header:", header?.slice(0, 60));
    } else {
      console.log(tag, "Signature verified OK");
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
  console.log(tag, "Event:", event_type, "| submission_id:", submissionId);

  const supabase = createAdminClient();

  if (event_type === "submission.completed") {
    // Find the contract
    const { data: contract, error: findError } = await supabase
      .from("contracts")
      .select("id, enrollment_id")
      .filter("docuseal_submission_id", "eq", submissionId)
      .single();

    if (findError || !contract) {
      console.error(tag, "Contract not found for submission_id:", submissionId, "| error:", findError?.message);
      return Response.json({ received: true });
    }

    console.log(tag, "Contract found:", contract.id);

    const d = data as {
      completed_at?: string;
      documents?: Array<{ name: string; url: string }>;
      submitters?: Array<{ documents?: Array<{ name: string; url: string }> }>;
    };

    // 1. Update status to firmado immediately — don't wait for PDF
    const signedAt = d.completed_at ?? new Date().toISOString();
    const docusealUrl = d.documents?.[0]?.url ?? d.submitters?.[0]?.documents?.[0]?.url ?? null;

    const { error: updateError } = await supabase
      .from("contracts")
      .update({ status: "firmado", signed_at: signedAt, document_url: docusealUrl } as never)
      .eq("id", contract.id);

    if (updateError) {
      console.error(tag, "DB update error:", updateError.message);
    } else {
      console.log(tag, "Contract marked firmado. signed_at:", signedAt);
    }

    await supabase.from("contract_events").insert({
      contract_id: contract.id,
      enrollment_id: contract.enrollment_id,
      event_type: "signed",
      occurred_at: signedAt,
    } as never);

    if (contract.enrollment_id) {
      revalidatePath(`/enrollments/${contract.enrollment_id}`);
    }

    // 2. Download PDF and store in Supabase Storage (best-effort, non-blocking)
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
              await supabase
                .from("contracts")
                .update({ document_url: urlData.signedUrl } as never)
                .eq("id", contract.id);
              console.log(tag, "PDF stored and URL updated");
            }
          }
        } else {
          console.error(tag, "Failed to download PDF:", pdfRes.status);
        }
      } catch (err) {
        console.error(tag, "PDF upload exception:", err);
      }
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
        .update({ status: "borrador", docuseal_submission_id: null, docuseal_signing_url: null, sent_at: null } as never)
        .eq("id", contract.id);
      if (updateError) console.error(tag, "Expired update error:", updateError.message);
      await supabase.from("contract_events").insert({
        contract_id: contract.id,
        enrollment_id: contract.enrollment_id,
        event_type: "expired",
      } as never);
      if (contract.enrollment_id) revalidatePath(`/enrollments/${contract.enrollment_id}`);
      console.log(tag, "Submission expired — contract reverted to borrador");
    }
  }

  if (event_type === "form.declined") {
    // data is the submitter object — submission id is nested at data.submission.id
    const declinedSubmissionId = String(
      (data as { submission?: { id: number } }).submission?.id ?? submissionId
    );
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, enrollment_id")
      .filter("docuseal_submission_id", "eq", declinedSubmissionId)
      .single();

    if (contract) {
      const declinedAt = (data as { declined_at?: string }).declined_at ?? new Date().toISOString();
      const declineReason = (data as { decline_reason?: string }).decline_reason ?? null;
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          status: "borrador",
          declined_at: declinedAt,
          docuseal_submission_id: null,
          docuseal_signing_url: null,
          sent_at: null,
        } as never)
        .eq("id", contract.id);
      if (updateError) console.error(tag, "Declined update error:", updateError.message);
      await supabase.from("contract_events").insert({
        contract_id: contract.id,
        enrollment_id: contract.enrollment_id,
        event_type: "declined",
        occurred_at: declinedAt,
        decline_reason: declineReason,
      } as never);
      if (contract.enrollment_id) revalidatePath(`/enrollments/${contract.enrollment_id}`);
      console.log(tag, "Form declined — contract reverted to borrador with declined_at:", declinedAt);
    }
  }

  return Response.json({ received: true });
}
