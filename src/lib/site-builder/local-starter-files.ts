/** Minimal starter set (index + styles + script) for local workspace before template HTML is applied. */

export const LOCAL_MINIMAL_INDEX = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Site</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main style="max-width:42rem;margin:3rem auto;padding:0 1.25rem;font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a">
    <h1 style="font-size:1.5rem;margin-bottom:0.75rem">Your client site</h1>
    <p style="color:#475569">Edit HTML in Code mode or add sections in Templates mode.</p>
  </main>
  <script src="script.js"></script>
</body>
</html>
`;

export const LOCAL_MINIMAL_STYLES = `/* Global styles */
* { box-sizing: border-box; }
body { margin: 0; background: #f8fafc; color: #0f172a; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; }
`;

export const LOCAL_MINIMAL_SCRIPT = `// Client site scripts
console.log('Site script loaded');
`;

export function localBasicStarterMap(): Record<string, string> {
  return {
    'index.html': LOCAL_MINIMAL_INDEX,
    'styles.css': LOCAL_MINIMAL_STYLES,
    'script.js': LOCAL_MINIMAL_SCRIPT,
  };
}
