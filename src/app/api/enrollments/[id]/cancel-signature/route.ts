import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: contractRow } = await admin
    .from("contracts")
    .select("id, docuseal_submission_id")
    .eq("enrollment_id", id)
    .single();

  const contract = contractRow as unknown as { id: string; docuseal_submission_id: string | null } | null;
  if (!contract) return Response.json({ error: "Contrato no encontrado" }, { status: 404 });

  const submissionId = contract.docuseal_submission_id;

  // Cancel in DocuSeal (archive — makes signing link invalid)
  if (submissionId) {
    const apiKey = process.env.DOCUSEAL_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(`https://api.docuseal.com/submissions/${submissionId}`, {
          method: "DELETE",
          headers: { "X-Auth-Token": apiKey },
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("[cancel-signature] DocuSeal DELETE error:", res.status, text);
        } else {
          console.log("[cancel-signature] DocuSeal submission archived:", submissionId);
        }
      } catch (err) {
        console.error("[cancel-signature] DocuSeal request failed:", err);
      }
    }

    // Clear docuseal fields from DB regardless of DocuSeal response
    await admin
      .from("contracts")
      .update({ docuseal_submission_id: null, docuseal_signing_url: null, sent_at: null, status: "borrador" } as never)
      .eq("id", contract.id);
  }

  return Response.json({ ok: true });
}
