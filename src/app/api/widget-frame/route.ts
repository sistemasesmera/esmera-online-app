export const runtime = "nodejs";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  html,body{margin:0;padding:0;background:#f1f5f9;height:100%;font-family:system-ui,sans-serif;}
  .hint{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#94a3b8;font-size:13px;pointer-events:none;}
</style>
</head>
<body>
<div class="hint">Haz clic en el botón<br/>para abrir el chat ↘</div>
<script src="/api/widget.js" defer></script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
