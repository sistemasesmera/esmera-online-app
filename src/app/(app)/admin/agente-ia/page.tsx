import type { Metadata } from "next";
export const metadata: Metadata = { title: "Agente IA Web" };

import { redirect } from "next/navigation";

import { AgentIaClient } from "@/components/features/admin/agente-ia-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getAgentConfig, getAgentConversations } from "./actions";

export default async function AgentIaPage() {
  const current = await getCurrentUser();
  if (!current || current.role !== "tech") redirect("/dashboard");

  const [config, conversations] = await Promise.all([
    getAgentConfig(),
    getAgentConversations(),
  ]);
  if (!config) redirect("/dashboard");

  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.esmeraonline.com";

  return <AgentIaClient config={config} hasApiKey={hasApiKey} appUrl={appUrl} conversations={conversations} />;
}
