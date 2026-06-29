import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      const documentUrl = data.documents?.[0]?.url ?? null;

      const { error } = await supabase
        .from("contracts")
        .update({
          status: "firmado",
          document_url: documentUrl,
          signed_at: data.completed_at ?? new Date().toISOString(),
        } as never)
        .eq("docuseal_submission_id" as never, submissionId);

      if (error) {
        console.error("[webhook/docuseal] Error updating contract (completed):", error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    if (event_type === "submission.expired") {
      const { error } = await supabase
        .from("contracts")
        .update({
          status: "borrador",
          docuseal_submission_id: null,
          sent_at: null,
        } as never)
        .eq("docuseal_submission_id" as never, submissionId);

      if (error) {
        console.error("[webhook/docuseal] Error updating contract (expired):", error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("[webhook/docuseal] Parse error:", err);
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
