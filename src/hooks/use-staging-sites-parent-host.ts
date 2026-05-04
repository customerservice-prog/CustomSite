import { useEffect, useState } from 'react';

type PublicCfg = { stagingSitesParentHost?: string | null };

export function useStagingSitesParentHost(): string | null {
  const [parent, setParent] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/config/public', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((c: PublicCfg) => {
        const t =
          typeof c.stagingSitesParentHost === 'string' ? c.stagingSitesParentHost.trim().toLowerCase() : '';
        if (!cancelled) setParent(t || null);
      })
      .catch(() => {
        if (!cancelled) setParent(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return parent;
}
