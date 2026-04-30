import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { newFile } from '@/lib/site-builder/project-site-model';
import { saveProjectSite } from '@/lib/site-builder/project-site-storage';

const INDEX_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>New Site</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Hello World</h1>
  <script src="script.js"></script>
</body>
</html>
`;

const RICH_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your homepage</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header style="padding:1rem 1.5rem;border-bottom:1px solid #e4e4e7;background:#fff">
    <span style="font-weight:700;letter-spacing:-0.02em;color:#18181b">Brand</span>
  </header>
  <main>
    <section style="padding:clamp(3rem,8vw,5rem) 1.5rem;background:linear-gradient(135deg,#faf5ff 0%,#fff 55%);">
      <div style="max-width:42rem">
        <p style="margin:0 0 0.5rem;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#7c3aed">Welcome</p>
        <h1 style="margin:0 0 1rem;font-size:clamp(2rem,4vw,2.75rem);line-height:1.1;letter-spacing:-0.03em;color:#0f172a">Ship a premium client site — fast.</h1>
        <p style="margin:0 0 1.5rem;font-size:1.05rem;line-height:1.6;color:#475569">Starter layout with hero, proof strip, and CTA. Edit code or open Bryan the Brain to iterate.</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem">
          <a href="#cta" style="display:inline-flex;align-items:center;border-radius:0.5rem;background:#7c3aed;color:#fff;font-weight:600;padding:0.65rem 1.25rem;text-decoration:none">Primary CTA</a>
          <a href="#proof" style="display:inline-flex;align-items:center;border-radius:0.5rem;border:1px solid #c4b5fd;color:#5b21b6;font-weight:600;padding:0.65rem 1.25rem;text-decoration:none">Learn more</a>
        </div>
      </div>
    </section>
    <section id="proof" style="padding:clamp(2.5rem,5vw,4rem) 1.5rem;background:#fafafa;border-top:1px solid #e4e4e7">
      <div style="max-width:56rem;margin:0 auto;text-align:center">
        <h2 style="margin:0 0 0.5rem;font-size:1.25rem;color:#0f172a">Trusted by teams like yours</h2>
        <p style="margin:0 auto 1.5rem;max-width:36rem;color:#64748b;font-size:0.95rem">Swap logos or quotes — this block is ready for social proof.</p>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1.5rem;font-size:0.8rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em">
          <span>Client A</span><span>Client B</span><span>Client C</span>
        </div>
      </div>
    </section>
    <section id="cta" style="padding:clamp(2.5rem,6vw,4.5rem) 1.5rem;background:#0f172a;color:#f8fafc">
      <div style="max-width:40rem;margin:0 auto;text-align:center">
        <h2 style="margin:0 0 0.75rem;font-size:clamp(1.35rem,3vw,1.85rem)">Ready to go live?</h2>
        <p style="margin:0 0 1.25rem;color:#94a3b8;line-height:1.6">One-click publish when your project is linked to staging.</p>
        <span style="display:inline-block;border-radius:0.5rem;background:#7c3aed;padding:0.65rem 1.5rem;font-weight:700">Book a call</span>
      </div>
    </section>
  </main>
  <footer style="padding:1.25rem 1.5rem;border-top:1px solid #e4e4e7;font-size:0.8rem;color:#64748b;text-align:center">© Your studio</footer>
  <script src="script.js"></script>
</body>
</html>
`;

const STYLES_CSS = `body {
  font-family: sans-serif;
}
`;

const RICH_STYLES_CSS = `* { box-sizing: border-box; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
a { transition: opacity 0.15s ease; }
a:hover { opacity: 0.9; }
`;

const SCRIPT_JS = `console.log("Site loaded");
`;

export type StarterSiteOptions = {
  /** Multi-section homepage + stronger defaults for client_site projects. */
  rich?: boolean;
};

export async function createStarterFiles(projectId: string, opts?: StarterSiteOptions): Promise<ProjectSite> {
  const rich = Boolean(opts?.rich);
  const site: ProjectSite = {
    projectId,
    files: [
      newFile('index.html', rich ? RICH_INDEX_HTML : INDEX_HTML),
      newFile('styles.css', rich ? RICH_STYLES_CSS : STYLES_CSS),
      newFile('script.js', SCRIPT_JS),
    ],
  };
  await saveProjectSite(site);
  return site;
}
