"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Bot, Send, Loader2, CheckCircle2, XCircle, Copy, Check } from "lucide-react";

import { saveAgentConfig, type AgentConfig } from "@/app/(app)/admin/agente-ia/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (rápido y económico)" },
  { value: "gpt-4o", label: "GPT-4o (más capaz)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AgentIaClient({
  config,
  hasApiKey,
  appUrl,
}: {
  config: AgentConfig;
  hasApiKey: boolean;
  appUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const embedCode = `<script src="${appUrl}/api/widget.js" defer></script>`;

  const [isActive, setIsActive] = useState(config.is_active);
  const [model, setModel] = useState(config.model);
  const [welcomeMessage, setWelcomeMessage] = useState(config.welcome_message);
  const [systemPrompt, setSystemPrompt] = useState(config.system_prompt);
  const [knowledge, setKnowledge] = useState(config.knowledge);

  // Preview chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleSave() {
    startTransition(async () => {
      const result = await saveAgentConfig({ is_active: isActive, model, welcome_message: welcomeMessage, system_prompt: systemPrompt, knowledge });
      if (result.error) toast.error(result.error);
      else toast.success("Configuración guardada");
    });
  }

  async function handleChatSend() {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "preview-internal" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          preview: true,
          overrides: { system_prompt: systemPrompt, knowledge, model, welcome_message: welcomeMessage },
        }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error ?? "Error al conectar con el agente");
      else setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch {
      toast.error("Error de red");
    } finally {
      setIsChatLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Agente IA Web</h1>
            <p className="text-sm text-muted-foreground">Configura el asistente virtual de la web</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasApiKey
            ? <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50"><CheckCircle2 className="h-3.5 w-3.5" />API Key configurada</Badge>
            : <Badge variant="outline" className="gap-1.5 text-destructive border-destructive/30 bg-destructive/5"><XCircle className="h-3.5 w-3.5" />Falta OPENAI_API_KEY</Badge>
          }
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="prompt">
        <TabsList>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="conocimiento">Conocimiento</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          <TabsTrigger value="integracion">Integración</TabsTrigger>
          <TabsTrigger value="preview">Vista previa</TabsTrigger>
        </TabsList>

        {/* ── Prompt ── */}
        <TabsContent value="prompt" className="mt-4 flex flex-col gap-3">
          <div>
            <Label>Prompt del sistema</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Define la personalidad, tono y comportamiento del agente. El agente siempre usará este prompt como base.
            </p>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={`Eres el asistente virtual de Esmera School, una escuela de estética y belleza. Tu objetivo es informar sobre los cursos disponibles, resolver dudas y captar el interés de potenciales alumnos. Sé amable, profesional y conciso. Si el usuario muestra interés en matricularse, pídele su nombre y teléfono para que el equipo comercial le contacte.`}
              rows={14}
              className="font-mono text-sm resize-none"
            />
          </div>
        </TabsContent>

        {/* ── Conocimiento ── */}
        <TabsContent value="conocimiento" className="mt-4 flex flex-col gap-3">
          <div>
            <Label>Base de conocimiento</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Añade aquí toda la información que el agente debe conocer: cursos, precios, horarios, FAQs, política de devoluciones, etc. Escríbelo en texto libre, el agente lo usará como contexto.
            </p>
            <Textarea
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              placeholder={`CURSOS DISPONIBLES
---
Curso de Estética Integral
- Duración: 6 meses
- Precio: 1.200€
- Modalidad: Online
- Incluye: Certificado oficial, acceso a plataforma 24/7

Curso de Micropigmentación
- Duración: 3 meses
- Precio: 800€
...

PREGUNTAS FRECUENTES
---
¿Ofrecéis financiación? Sí, trabajamos con Sequra y Alma.
¿Los títulos son oficiales? Sí, están homologados por...`}
              rows={18}
              className="font-mono text-sm resize-none"
            />
          </div>
        </TabsContent>

        {/* ── Configuración ── */}
        <TabsContent value="configuracion" className="mt-4 flex flex-col gap-6 max-w-lg">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Agente activo</p>
              <p className="text-xs text-muted-foreground">El endpoint /api/public/chat responderá peticiones</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">GPT-4o Mini es suficiente para la mayoría de casos y es 10x más barato.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Mensaje de bienvenida</Label>
            <Input
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="¡Hola! Soy el asistente virtual de Esmera School. ¿En qué puedo ayudarte?"
            />
            <p className="text-xs text-muted-foreground">Primer mensaje que verá el usuario al abrir el chat.</p>
          </div>

          <div className="rounded-lg border p-4 bg-muted/40">
            <p className="text-sm font-medium mb-1">Variable de entorno requerida</p>
            <code className="text-xs bg-background border rounded px-2 py-1">OPENAI_API_KEY=sk-...</code>
            <p className="text-xs text-muted-foreground mt-1">Añádela en Vercel → Settings → Environment Variables.</p>
          </div>
        </TabsContent>

        {/* ── Integración ── */}
        <TabsContent value="integracion" className="mt-4 flex flex-col gap-6 max-w-2xl">
          <div className="rounded-lg border p-5 flex flex-col gap-4">
            <div>
              <p className="font-semibold text-sm mb-1">Código de instalación</p>
              <p className="text-xs text-muted-foreground">
                Pega este tag <code className="bg-muted px-1 rounded">&lt;script&gt;</code> justo antes del cierre de <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> en tu web. El widget flotante aparecerá automáticamente en todas las páginas.
              </p>
            </div>
            <div className="relative">
              <pre className="bg-muted rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all pr-12">
                {embedCode}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-background border bg-background transition-colors"
                aria-label="Copiar código"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div className="rounded-lg border p-5 flex flex-col gap-3">
            <p className="font-semibold text-sm">En Astro</p>
            <p className="text-xs text-muted-foreground">Añade el script en tu layout principal (<code className="bg-muted px-1 rounded">src/layouts/Layout.astro</code>):</p>
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre">{`<body>
  <slot />
  <script src="${appUrl}/api/widget.js" defer></script>
</body>`}</pre>
          </div>

          <div className="rounded-lg border p-5 flex flex-col gap-3">
            <p className="font-semibold text-sm">Cómo funciona</p>
            <ul className="text-xs text-muted-foreground flex flex-col gap-1.5 list-disc list-inside">
              <li>El script crea un botón flotante (esquina inferior derecha) en la web.</li>
              <li>Al hacer clic se abre el chat con el mensaje de bienvenida configurado.</li>
              <li>Las respuestas vienen del agente configurado en esta pantalla.</li>
              <li>Si desactivas el agente desde &quot;Configuración&quot;, el botón desaparece automáticamente.</li>
              <li>El widget se autoactualiza — no necesitas tocar el código de la web para cambiar el comportamiento.</li>
            </ul>
          </div>
        </TabsContent>

        {/* ── Vista previa ── */}
        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg flex flex-col h-[520px]">
            <div className="border-b px-4 py-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Vista previa — usa la configuración actual del editor</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {chatMessages.length === 0 && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm max-w-[80%]">
                    {welcomeMessage || "¡Hola! ¿En qué puedo ayudarte?"}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t p-3 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe un mensaje…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                disabled={isChatLoading || !hasApiKey}
              />
              <Button size="icon" onClick={handleChatSend} disabled={!chatInput.trim() || isChatLoading || !hasApiKey}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {!hasApiKey && (
              <p className="text-xs text-destructive text-center pb-2">Configura OPENAI_API_KEY para usar la vista previa</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
