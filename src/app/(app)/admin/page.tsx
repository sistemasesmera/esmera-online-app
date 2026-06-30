import type { Metadata } from "next";
export const metadata: Metadata = { title: "Administración" };

import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/users");
}
