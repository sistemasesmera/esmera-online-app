export default function WidgetPreviewPage() {
  return (
    <>
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Widget Preview — Esmera Online</title>
          <style>{`
            body { margin: 0; font-family: system-ui, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
            .card h1 { margin: 0 0 8px; font-size: 20px; color: #111; }
            .card p { color: #6b7280; font-size: 14px; margin: 0; }
            .badge { display: inline-block; margin-top: 16px; background: #eef2ff; color: #4f46e5; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; }
          `}</style>
        </head>
        <body>
          <div className="card">
            <h1>Vista previa del widget</h1>
            <p>El botón de chat debería aparecer en la esquina inferior derecha de esta página.</p>
            <span className="badge">● Agente IA activo</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="/api/widget.js" />
        </body>
      </html>
    </>
  );
}
