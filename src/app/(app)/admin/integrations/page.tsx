import { BookOpen, CreditCard, FileOutput, Mail, MessageCircle, PenLine, Plug } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { CAPABILITIES } from "@/lib/domain/shared/permissions";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type IntegrationCardProps = {
  icon: React.ReactNode;
  name: string;
  description: string;
  port: string;
  status: "activa" | "pendiente";
  detail?: string;
};

function IntegrationCard({ icon, name, description, port, status, detail }: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted text-muted-foreground">{icon}</div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{port}</p>
            </div>
          </div>
          <Badge
            className={
              status === "activa"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 shrink-0"
            }
          >
            {status === "activa" ? "Configurada" : "Pendiente"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
        {detail && (
          <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function IntegrationsPage() {
  await requireRole(CAPABILITIES.manageUsers);

  const supabase = await createClient();
  const { data: platforms } = await supabase
    .from("platforms")
    .select("id, code, name, is_active")
    .eq("is_active", true);

  const activePlatformCodes = new Set((platforms ?? []).map((p) => p.code));
  const lmsActive = activePlatformCodes.size > 0;
  const activePlatformNames = (platforms ?? []).map((p) => p.name).join(", ");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conectores externos disponibles. Cada integración expone un puerto (interfaz) que permite
          cambiar el proveedor sin modificar el núcleo de la aplicación.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Plataformas LMS
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <IntegrationCard
              icon={<BookOpen className="h-4 w-4" />}
              name="Plataformas LMS"
              description="Conexión con Moodle, EvolCampus u otras plataformas de aprendizaje configuradas. Permite sincronizar matrículas y consultar progreso del alumno."
              port="LmsProviderPort"
              status={lmsActive ? "activa" : "pendiente"}
              detail={lmsActive ? `Plataformas activas: ${activePlatformNames}` : undefined}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Comercial y contratos
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <IntegrationCard
              icon={<CreditCard className="h-4 w-4" />}
              name="Pasarela de pago"
              description="Genera enlaces de pago y verifica el estado de las transacciones. Compatible con Stripe u otros proveedores PSP."
              port="PaymentProviderPort"
              status="pendiente"
            />
            <IntegrationCard
              icon={<PenLine className="h-4 w-4" />}
              name="Firma electrónica"
              description="Envía contratos para firma digital y obtiene el documento firmado. Compatible con Signaturit, DocuSign u otros."
              port="ESignatureProviderPort"
              status="pendiente"
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Comunicación
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <IntegrationCard
              icon={<MessageCircle className="h-4 w-4" />}
              name="Mensajería (WhatsApp)"
              description="Envía mensajes y plantillas aprobadas a leads y alumnos vía WhatsApp Business API."
              port="MessagingProviderPort"
              status="pendiente"
            />
            <IntegrationCard
              icon={<Mail className="h-4 w-4" />}
              name="Email transaccional"
              description="Envío de correos individuales y en masa (confirmaciones, certificados, recordatorios). Compatible con Resend, SendGrid u otros."
              port="EmailProviderPort"
              status="pendiente"
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Exportación y compliance
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <IntegrationCard
              icon={<FileOutput className="h-4 w-4" />}
              name="FUNDAE / Certificados de Profesionalidad"
              description="Genera informes en el formato exigido por FUNDAE y exporta expedientes para Certificados de Profesionalidad."
              port="ExportProviderPort"
              status="pendiente"
            />
          </div>
        </section>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Plug className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Las integraciones marcadas como <strong>Pendiente</strong> tienen el puerto (interfaz TypeScript)
              definido en <code className="text-xs bg-muted px-1 rounded">src/lib/integrations/ports/</code>.
              Para activar una integración, crea el adaptador correspondiente e inyéctalo vía factory
              según <code className="text-xs bg-muted px-1 rounded">platforms.code</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
