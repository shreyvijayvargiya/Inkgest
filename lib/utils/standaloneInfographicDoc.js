/** Build a standalone HTML document for infographic iframe embedding / export parity. */

export function buildStandaloneIframeSrcDoc(innerHtml = "", subtitle = "") {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${String(subtitle || "Infographic").replace(/</g, "")}</title>
<link href="https://fonts.googleapis.com/css2?family=Comic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Comic', sans-serif;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    
  }
  .ig-root { width: 100%; max-width: 520px; }
  /* Keep bar/step animations visible in embedded iframes (static export uses reducedMotion). */
  svg rect, svg circle { opacity: 1 !important; }
</style>
</head>
<body>
<div class="ig-root">
${innerHtml || ""}
</div>
</body>
</html>`;
}
