import { Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BASE_URL = "https://app.esmeraonline.com";
const ENDPOINT = "/api/public/leads";

const REQUEST_EXAMPLE = JSON.stringify(
  {
    full_name: "María García López",
    email: "maria@ejemplo.com",
    phone: "600123456",
    source: "web",
    interested_course: "Desarrollo Web",
    notes: "Interesada en el turno de tarde",
  },
  null,
  2
);

const RESPONSE_EXAMPLE = JSON.stringify(
  {
    ok: true,
    lead: {
      id: "uuid-del-lead",
      full_name: "María García López",
      email: "maria@ejemplo.com",
      phone: "600123456",
      source: "web",
      status: "nuevo",
      interested_course: "Desarrollo Web",
      created_at: "2026-06-29T10:00:00.000Z",
    },
  },
  null,
  2
);

const fields = [
  { name: "full_name",          type: "string",  required: true,  desc: "Nombre completo del lead" },
  { name: "email",              type: "string",  required: false, desc: "Correo electrónico" },
  { name: "phone",              type: "string",  required: false, desc: "Teléfono de contacto" },
  { name: "source",             type: "enum",    required: false, desc: "Origen: web · meta_ads · organico (por defecto: web)" },
  { name: "interested_course",  type: "string",  required: false, desc: "Nombre del curso de interés" },
  { name: "notes",              type: "string",  required: false, desc: "Notas adicionales" },
];

export default function ApiPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Code2 className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold">API Pública</h1>
          <p className="text-sm text-muted-foreground">Endpoints disponibles para integraciones externas</p>
        </div>
      </div>

      <Card className="border card-shadow">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-mono text-xs">POST</Badge>
            <code className="text-sm font-semibold">{BASE_URL}{ENDPOINT}</code>
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground mt-1">Crear un lead</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-4">

          {/* Auth */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Autenticación</h2>
            <p className="text-sm">Incluye tu API key en el header de la petición:</p>
            <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`X-Api-Key: tu_api_key`}</pre>
            <p className="text-xs text-muted-foreground">También se acepta <code className="font-mono">Authorization: Bearer tu_api_key</code></p>
          </section>

          {/* Fields */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campos del body (JSON)</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Campo</th>
                    <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold">Requerido</th>
                    <th className="text-left px-3 py-2 font-semibold">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, i) => (
                    <tr key={f.name} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-3 py-2 font-mono text-indigo-700">{f.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                      <td className="px-3 py-2">
                        {f.required
                          ? <span className="text-red-600 font-semibold">Sí</span>
                          : <span className="text-muted-foreground">No</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Request example */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ejemplo de petición</h2>
            <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{`curl -X POST ${BASE_URL}${ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: tu_api_key" \\
  -d '${REQUEST_EXAMPLE}'`}</pre>
          </section>

          {/* Response */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Respuesta exitosa <span className="text-emerald-600 font-mono">201</span></h2>
            <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{RESPONSE_EXAMPLE}</pre>
          </section>

          {/* Errors */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Códigos de error</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Código</th>
                    <th className="text-left px-3 py-2 font-semibold">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["401", "API key inválida o ausente"],
                    ["422", "Campos requeridos faltantes o valores inválidos"],
                    ["500", "Error interno del servidor"],
                  ].map(([code, reason], i) => (
                    <tr key={code} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-3 py-2 font-mono text-red-600 font-semibold">{code}</td>
                      <td className="px-3 py-2 text-muted-foreground">{reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
