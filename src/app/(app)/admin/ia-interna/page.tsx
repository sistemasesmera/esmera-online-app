import type { Metadata } from "next";
export const metadata: Metadata = { title: "IA Interna" };

import { Bot } from "lucide-react";
import { redirect } from "next/navigation";

import { IAInternaClient } from "@/components/features/admin/ia-interna-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listIAPrompts } from "./actions";

export default async function IAInternaPage() {
  const user = await getCurrentUser();
  if (!user || !["tech", "jefe_comercial"].includes(user.role)) {
    redirect("/dashboard");
  }

  const prompts = await listIAPrompts();

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200">
            <Bot className="h-5 w-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">IA Interna</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Configura los prompts de cada proceso de inteligencia artificial.
        </p>
      </div>

      <IAInternaClient prompts={prompts} />
    </div>
  );
}
