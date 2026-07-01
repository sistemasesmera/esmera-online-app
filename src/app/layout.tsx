import type { Metadata } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · Esmera",
    default: "Esmera Online Manager",
  },
  description: "Gestión comercial, administrativa y de seguimiento del alumnado de Esmera Online",
  applicationName: "Esmera Online Manager",
  authors: [{ name: "Esmera School" }],
  keywords: ["gestión académica", "formación online", "CRM educativo", "Esmera"],
  metadataBase: new URL("https://app.esmeraschool.com"),
  openGraph: {
    type: "website",
    siteName: "Esmera Online Manager",
    title: "Esmera Online Manager",
    description: "Plataforma de gestión académica y comercial de Esmera School",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`light ${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
