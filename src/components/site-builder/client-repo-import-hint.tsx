import { ExternalLink } from 'lucide-react';
import { parseGithubRepoBundleLinks } from '@/lib/client-source-repo';
import { cn } from '@/lib/utils';

/** Shown in Site builder when project was created with a saved client repo URL. */
export function ClientRepoImportHint({ repoUrl }: { repoUrl: string }) {
  const gh = parseGithubRepoBundleLinks(repoUrl);
  return (
    <div
      role="note"
      className={cn(
        'shrink-0 border-b border-violet-500/35 bg-gradient-to-r from-violet-950/95 to-zinc-950 px-3 py-2.5 text-[11px] leading-relaxed text-violet-100 sm:text-xs',
      )}
    >
      <p className="font-semibold text-violet-200">Importing from the client&apos;s repo</p>
      <p className="mt-1 text-violet-100/90">
        Saved source:{' '}
        <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline decoration-violet-400/80 underline-offset-2">
          {repoUrl}
          <ExternalLink className="ml-1 inline-block h-3 w-3 align-middle opacity-70" aria-hidden />
        </a>
      </p>
      {gh ? (
        <div className="mt-2 space-y-1.5 text-violet-100/85">
          <p className="text-[11px] text-violet-300/95">
            Quick path for <span className="font-mono text-[10px] text-white">{gh.ownerRepo}</span>:
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-[11px] sm:text-[12px]">
            <li>
              Download a ZIP —{' '}
              <a href={gh.zipMain} className="font-medium text-white underline decoration-violet-400/70" target="_blank" rel="noopener noreferrer">
                main (default)
              </a>{' '}
              ·{' '}
              <a href={gh.zipMaster} className="font-medium text-white underline decoration-violet-400/70" target="_blank" rel="noopener noreferrer">
                master (if main 404s)
              </a>
              .
            </li>
            <li>Unzip and copy <span className="font-mono text-white/95">index.html</span>, <span className="font-mono">styles.css</span>,{' '}
              <span className="font-mono">script.js</span> (or your paths) into this workspace via <strong className="text-white">Code</strong> —
              paste or upload files.</li>
            <li>Use <strong className="text-white">Paste site bundle</strong> if you duplicated another CustomSite export (JSON).</li>
          </ol>
          <p className="text-[10px] text-violet-400/90">
            CustomSite does not clone private GitHub repos from here — use ZIP or paste files after the client grants access.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-violet-200/85">
          Open the repo, download or copy static files (<span className="font-mono">index.html</span> + assets), and add them in <strong className="text-white">Code</strong> mode. For{' '}
          <strong className="text-white">Paste site bundle</strong>, use JSON from CustomSite&apos;s Copy site export.
        </p>
      )}
    </div>
  );
}
