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
  try {
    const rawBody = await req.text();
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;

    if (secret) {
      const header = req.headers.get("x-docuseal-signature");
      if (!verifySignature(rawBody, header, secret)) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { event_type, data } = payload as {
      event_type: string;
      data: {
        id: number;
        completed_at?: string;
        documents?: Array<{ name: string; url: string }>;
      };
    };

    const submissionId = String(data.id);
    const supabase = createAdminClient();

    if (event_type === "submission.completed") {
      // Find contract to get enrollment_id
      const { data: contract, error: findError } = await supabase
        .from("contracts")
        .select("id, enrollment_id")
        .filter("docuseal_submission_id", "eq", submissionId)
        .single();

      if (findError || !contract) {
        console.error("[webhook/docuseal] Contract not found for submission:", submissionId, findError);
        return Response.json({ received: true });
      }

      // Download the signed PDF from DocuSeal and upload to Supabase Storage
      const docusealUrl = data.documents?.[0]?.url ?? null;
      let finalDocumentUrl: string | null = docusealUrl;

      if (docusealUrl && contract.enrollment_id) {
        try {
          const pdfRes = await fetch(docusealUrl);
          if (pdfRes.ok) {
            const pdfBuffer = await pdfRes.arrayBuffer();
            const storagePath = `contracts/${contract.enrollment_id}/contrato-firmado.pdf`;

            await supabase.storage.from(BUCKET).upload(storagePath, pdfBuffer, {
              contentType: "application/pdf",
              upsert: true,
            });

            const { data: urlData } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

            if (urlData?.signedUrl) finalDocumentUrl = urlData.signedUrl;
          }
        } catch (uploadErr) {
          console.error("[webhook/docuseal] Error uploading signed PDF:", uploadErr);
          // Fallback: use DocuSeal URL directly
        }
      }

      await supabase
        .from("contracts")
        .update({
          status: "firmado",
          document_url: finalDocumentUrl,
          signed_at: data.completed_at ?? new Date().toISOString(),
        } as never)
        .eq("id", contract.id);

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
        await supabase
          .from("contracts")
          .update({
            status: "borrador",
            docuseal_submission_id: null,
            sent_at: null,
          } as never)
          .eq("id", contract.id);

        if (contract.enrollment_id) {
          revalidatePath(`/enrollments/${contract.enrollment_id}`);
        }
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("[webhook/docuseal] Error:", err);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
