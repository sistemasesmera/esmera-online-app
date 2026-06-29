import { Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./copy-button";

const BASE_URL = "https://app.esmeraonline.com";
const ENDPOINT = "/api/public/leads";

const fields = [
  { name: "full_name",         type: "string", required: true,  desc: "Nombre completo del lead" },
  { name: "email",             type: "string", required: false, desc: "Correo electrónico" },
  { name: "phone",             type: "string", required: false, desc: "Teléfono de contacto" },
  { name: "source",            type: "enum",   required: false, desc: "Origen: web · meta_ads · organico  (por defecto: web)" },
  { name: "interested_course", type: "string", required: false, desc: "Nombre del curso de interés" },
  { name: "notes",             type: "string", required: false, desc: "Notas adicionales" },
];

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

export default function ApiPage() {
  const apiKey = process.env.PUBLIC_API_KEY ?? "(no configurada)";

  const requestExample = JSON.stringify(
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

  const curlExample = `curl -X POST ${BASE_URL}${ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: ${apiKey}" \\
  -d '${requestExample}'`;

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Code2 className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold">API Pública</h1>
          <p className="text-sm text-muted-foreground">Endpoints disponibles para integraciones externas</p>
        </div>
      </div>

      {/* API Key */}
      <Card className="border card-shadow">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold">Tu API Key</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Incluye esta key en cada petición como header <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">X-Api-Key</code>.</p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <code className="flex-1 text-xs font-mono break-all text-indigo-700">{apiKey}</code>
            <CopyButton text={apiKey} />
          </div>
        </CardContent>
      </Card>

      {/* Endpoint */}
      <Card className="border card-shadow">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-mono text-xs">POST</Badge>
            <code className="text-sm font-semibold">{BASE_URL}{ENDPOINT}</code>
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground mt-1">Crear un lead</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-4">

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

          {/* Curl example */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ejemplo de petición (curl)</h2>
              <CopyButton text={curlExample} />
            </div>
            <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
          </section>

          {/* Response */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Respuesta exitosa <span className="text-emerald-600 font-mono">201</span>
            </h2>
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
