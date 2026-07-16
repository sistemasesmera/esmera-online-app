import Script from "next/script";

export default function WidgetPreviewPage() {
  return (
    <div style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 40, maxWidth: 480, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#111" }}>Vista previa del widget</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          El botón de chat debería aparecer en la esquina inferior derecha de esta página.
        </p>
        <span style={{ display: "inline-block", marginTop: 16, background: "#eef2ff", color: "#4f46e5", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600 }}>
          ● Agente IA activo
        </span>
      </div>
      <Script src="/api/widget.js" strategy="afterInteractive" />
    </div>
  );
}
