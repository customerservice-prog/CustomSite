import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AGENCY_SITE_PAGES, createDefaultSections } from '@/lib/site-production/defaults';
import type { SiteSection } from '@/lib/site-production/types';

export function siteProductionBundleKey(projectId: string, pagePath: string) {
  return `${projectId}::${pagePath}`;
}

function bundleKey(projectId: string, pagePath: string) {
  return siteProductionBundleKey(projectId, pagePath);
}

type SectionsMap = Record<string, SiteSection[]>;

interface SiteProductionState {
  /** projectId::pagePath → ordered sections */
  sectionsByBundle: SectionsMap;
  ensurePagesForProject: (projectId: string) => void;
  updateSection: (projectId: string, pagePath: string, sectionId: string, patch: Partial<SiteSection>) => void;
  moveSection: (projectId: string, pagePath: string, sectionId: string, direction: -1 | 1) => void;
  getSections: (projectId: string, pagePath: string) => SiteSection[];
}

export const useSiteProductionStore = create<SiteProductionState>()(
  persist(
    (set, get) => ({
      sectionsByBundle: {},

      ensurePagesForProject: (projectId) => {
        set((s) => {
          const next = { ...s.sectionsByBundle };
          for (const p of AGENCY_SITE_PAGES) {
            const k = bundleKey(projectId, p.path);
            if (!next[k] || next[k].length === 0) {
              next[k] = createDefaultSections(p.path === '/' ? '/' : p.path, p.name);
            }
          }
          return { sectionsByBundle: next };
        });
      },

      getSections: (projectId, pagePath) => {
        const k = bundleKey(projectId, pagePath);
        return get().sectionsByBundle[k] ?? [];
      },

      updateSection: (projectId, pagePath, sectionId, patch) => {
        const k = bundleKey(projectId, pagePath);
        set((s) => {
          const pageTitle = AGENCY_SITE_PAGES.find((p) => p.path === pagePath)?.name ?? 'Page';
          const list =
            s.sectionsByBundle[k] ?? createDefaultSections(pagePath === '/' ? '/' : pagePath, pageTitle);
          const nextList = list.map((row) => (row.id === sectionId ? { ...row, ...patch } : row));
          return { sectionsByBundle: { ...s.sectionsByBundle, [k]: nextList } };
        });
      },

      moveSection: (projectId, pagePath, sectionId, direction) => {
        const k = bundleKey(projectId, pagePath);
        set((s) => {
          const pageTitle = AGENCY_SITE_PAGES.find((p) => p.path === pagePath)?.name ?? 'Page';
          const base =
            s.sectionsByBundle[k] ?? createDefaultSections(pagePath === '/' ? '/' : pagePath, pageTitle);
          const list = [...base].sort((a, b) => a.order - b.order);
          const idx = list.findIndex((x) => x.id === sectionId);
          if (idx < 0) return s;
          const j = idx + direction;
          if (j < 0 || j >= list.length) return s;
          const a = list[idx]!;
          const b = list[j]!;
          const orderA = a.order;
          const orderB = b.order;
          const nextList = list.map((row) => {
            if (row.id === a.id) return { ...row, order: orderB };
            if (row.id === b.id) return { ...row, order: orderA };
            return row;
          });
          return { sectionsByBundle: { ...s.sectionsByBundle, [k]: nextList } };
        });
      },
    }),
    {
      name: 'cs-site-production-v1',
      partialize: (s) => ({ sectionsByBundle: s.sectionsByBundle }),
    }
  )
);
