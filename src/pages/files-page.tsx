import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FolderOpen, Link2, Plus, Search, Upload } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { useClients, useFiles, useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import type { AgencyFile } from '@/lib/types/entities';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import { EntityDrawer } from '@/components/ui/entity-drawer';
import { useShell } from '@/context/shell-context';
import * as sel from '@/store/selectors';
import { cn } from '@/lib/utils';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';

function extIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLS';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'IMG';
  return 'FILE';
}

export function FilesPage() {
  const { toast } = useShell();
  const [searchParams] = useSearchParams();
  const files = useFiles();
  const clients = useClients();
  const projects = useProjects();
  const addFile = useAppStore((s) => s.addFile);

  const [q, setQ] = useState('');
  const [folder, setFolder] = useState<string>('all');
  const [vis, setVis] = useState<'all' | AgencyFile['visibility']>('all');
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [visibility, setVisibility] = useState<AgencyFile['visibility']>('Internal');
  const [showUpload, setShowUpload] = useState(false);
  const [drawerFileId, setDrawerFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = searchParams.get('project');
    const c = searchParams.get('client');
    if (p) setProjectId(p);
    if (c) setClientId(c);
  }, [searchParams]);

  const drawerFile = useAppStore((s) => (drawerFileId ? s.files[drawerFileId] : undefined));
  const drawerActivities = useAppStore(
    useShallow((s) => {
      if (!drawerFileId) return [];
      const f = s.files[drawerFileId];
      if (!f) return [];
      return sel.getActivitiesForProject(s, f.projectId).slice(0, 12);
    })
  );

  const folders = useMemo(() => {
    const s = new Set<string>();
    files.forEach((f) => s.add(f.folder ?? 'General'));
    return ['all', ...Array.from(s).sort()];
  }, [files]);

  const rows = useMemo(() => {
    return files.filter((f) => {
      const match =
        !q.trim() ||
        f.name.toLowerCase().includes(q.toLowerCase()) ||
        (f.folder ?? '').toLowerCase().includes(q.toLowerCase());
      const fd = folder === 'all' || (f.folder ?? 'General') === folder;
      const v = vis === 'all' || f.visibility === vis;
      return match && fd && v;
    });
  }, [files, q, folder, vis]);

  const projectsForClient = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((p) => p.clientId === clientId);
  }, [projects, clientId]);

  function submitUpload() {
    if (!name.trim() || !clientId || !projectId) return;
    addFile({
      name: name.trim(),
      clientId,
      projectId,
      visibility,
      size: '—',
      folder: 'General',
    });
    setName('');
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast('File added to the library.', 'success');
  }

  function onPickLocalFile(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setName(f.name);
    setShowUpload(true);
    toast(`Selected “${f.name}”. Choose client and project, then save to the library.`, 'success');
  }

  const drawerClient = drawerFile ? clients.find((c) => c.id === drawerFile.clientId) : undefined;
  const drawerProject = drawerFile ? projects.find((p) => p.id === drawerFile.projectId) : undefined;

  const clientVisibleCount = useMemo(() => files.filter((f) => f.visibility === 'Client-visible').length, [files]);
  const internalCount = useMemo(() => files.filter((f) => f.visibility === 'Internal').length, [files]);

  const fileNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    const internal = files.find((f) => f.visibility === 'Internal');
    if (internal) {
      items.push({
        label: `Share ${internal.name} with client when ready`,
        hint: `${clients.find((c) => c.id === internal.clientId)?.company ?? 'Client'} · ${projects.find((p) => p.id === internal.projectId)?.name ?? 'Project'}`,
        href: '/files',
        tone: 'warning',
      });
    }
    const visible = files.find((f) => f.visibility === 'Client-visible');
    if (visible && items.length < 2) {
      items.push({
        label: `Confirm ${visible.name} still belongs in the portal`,
        href: '/files',
      });
    }
    return items.slice(0, 2);
  }, [files, clients, projects]);

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => onPickLocalFile(e.target.files)}
          />
          <PageHeader
            title="Client vs internal"
            description="Control what clients see and what stays internal."
            actions={
              <Button
                type="button"
                className="gap-2"
                onClick={() => {
                  setShowUpload(true);
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="h-4 w-4" />
                Upload file
              </Button>
            }
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Card variant="compact" className="border-0 bg-purple-50/40 ring-1 ring-purple-900/10">
              <p className="text-[11px] font-semibold uppercase text-purple-900/70">Client-visible</p>
              <p className="mt-1 text-2xl font-bold text-purple-950">{clientVisibleCount}</p>
            </Card>
            <Card variant="compact" className="border-0 bg-gray-50 ring-1 ring-gray-200">
              <p className="text-[11px] font-semibold uppercase text-gray-500">Internal</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{internalCount}</p>
            </Card>
            <Card variant="compact" className="border-0 bg-white ring-1 ring-gray-200">
              <p className="text-[11px] font-semibold uppercase text-gray-500">Total files</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{files.length}</p>
            </Card>
          </div>
          <RecommendedNextAction items={fileNextActions} />
        </div>
      }
    >
      {showUpload && (
        <Card className="border-indigo-100 bg-indigo-50/30 p-5 shadow-sm ring-1 ring-indigo-100/80">
          <h3 className="text-sm font-bold text-slate-900">Add a file</h3>
          <p className="mt-1 text-sm text-slate-600">
            Pick a file from your computer (opens the dialog), then link it to a client and project. This demo stores the row in your
            workspace — binary upload to a server is not wired yet.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="File name" aria-label="File name" />
            <Select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId('');
              }}
              aria-label="Client"
            >
              <option value="">Client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </Select>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project" disabled={!clientId}>
              <option value="">Project…</option>
              {projectsForClient.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value as AgencyFile['visibility'])} aria-label="Visibility">
              <option value="Internal">Internal</option>
              <option value="Client-visible">Client-visible</option>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={submitUpload} disabled={!name.trim() || !clientId || !projectId}>
              Save to library
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <TableToolbar>
        <TableToolbarSection grow>
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search files…"
              className="pl-10"
              aria-label="Search files"
            />
          </div>
          <Select value={folder} onChange={(e) => setFolder(e.target.value)} className="w-40 shrink-0" aria-label="Folder">
            {folders.map((f) => (
              <option key={f} value={f}>
                {f === 'all' ? 'All folders' : f}
              </option>
            ))}
          </Select>
          <Select value={vis} onChange={(e) => setVis(e.target.value as typeof vis)} className="w-44 shrink-0" aria-label="Visibility">
            <option value="all">All visibility</option>
            <option value="Internal">Internal</option>
            <option value="Client-visible">Client-visible</option>
          </Select>
        </TableToolbarSection>
      </TableToolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No files match"
          description="Upload contracts, creative, or reference material. Mark files as client-visible when they should appear in the portal."
          action={
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                setShowUpload(true);
                fileInputRef.current?.click();
              }}
            >
              <Plus className="h-4 w-4" />
              Upload file
            </Button>
          }
        />
      ) : (
        <Table dense footer={<TableFooterBar from={1} to={rows.length} total={rows.length} />}>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell className="w-14">Type</TableHeadCell>
              <TableHeadCell>Name</TableHeadCell>
              <TableHeadCell>Folder</TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
              <TableHeadCell>Project</TableHeadCell>
              <TableHeadCell>Uploaded</TableHeadCell>
              <TableHeadCell className="text-right">Size</TableHeadCell>
              <TableHeadCell>Visibility</TableHeadCell>
              <TableHeadCell className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => {
              const cl = clients.find((c) => c.id === f.clientId);
              const pr = projects.find((p) => p.id === f.projectId);
              return (
                <TableRow
                  key={f.id}
                  clickable
                  className={cn(drawerFileId === f.id && 'bg-indigo-50/50')}
                  onClick={() => setDrawerFileId(f.id)}
                >
                  <TableCell>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200/80">
                      {extIcon(f.name)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[220px] min-w-0 font-medium text-slate-900">
                    <span className="block truncate" title={f.name}>
                      {f.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">{f.folder ?? 'General'}</TableCell>
                  <TableCell>
                    {cl ? (
                      <Link to={`/clients/${cl.id}`} className="text-indigo-700 hover:text-indigo-900" onClick={(e) => e.stopPropagation()}>
                        {cl.company}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {pr ? (
                      <Link to={`/projects/${pr.id}`} className="text-indigo-700 hover:text-indigo-900" onClick={(e) => e.stopPropagation()}>
                        {pr.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500">{f.uploaded}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{f.size}</TableCell>
                  <TableCell>
                    <Badge variant={f.visibility === 'Client-visible' ? 'success' : 'neutral'}>{f.visibility}</Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DataRowMenu
                      label={`Actions for ${f.name}`}
                      items={[
                        { label: 'Preview', onClick: () => setDrawerFileId(f.id) },
                        { label: 'Download', onClick: () => toast(`Download started for ${f.name}.`, 'success') },
                        {
                          label: 'Change visibility',
                          onClick: () =>
                            toast(
                              f.visibility === 'Internal'
                                ? 'Marked client-visible in portal.'
                                : 'Marked internal only.',
                              'success'
                            ),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <EntityDrawer
        open={Boolean(drawerFile)}
        title={drawerFile?.name ?? 'File'}
        subtitle={drawerFile ? `${drawerFile.folder ?? 'General'} · ${drawerFile.visibility}` : undefined}
        onClose={() => setDrawerFileId(null)}
        footer={
          drawerFile ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => toast(`Download started for ${drawerFile.name}.`, 'success')}>
                Download
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() => {
                  const url = `${window.location.origin}/#/files?highlight=${encodeURIComponent(drawerFile.id)}`;
                  if (navigator.clipboard?.writeText) {
                    void navigator.clipboard.writeText(url).then(
                      () => toast('Link copied for your team.', 'success'),
                      () => toast(url, 'info')
                    );
                  } else {
                    toast(url, 'info');
                  }
                }}
              >
                <Link2 className="h-4 w-4" />
                Copy link
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowUpload(true);
                  fileInputRef.current?.click();
                }}
              >
                Replace upload
              </Button>
            </div>
          ) : null
        }
      >
        {drawerFile ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Details</p>
                <p className="mt-1 text-sm text-slate-700">Uploaded {drawerFile.uploaded}</p>
                <p className="text-sm text-slate-700">Size {drawerFile.size}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Linked records</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{drawerClient?.company ?? '—'}</p>
                <p className="text-sm text-slate-600">{drawerProject?.name ?? '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Project activity</p>
              <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {drawerActivities.length === 0 ? (
                  <li className="text-sm text-slate-500">No recent activity for this project.</li>
                ) : (
                  drawerActivities.map((a) => (
                    <li key={a.id} className="text-sm text-slate-700">
                      <span className="font-medium text-slate-900">{a.title}</span>
                      <span className="text-slate-500"> · {a.timeLabel}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </EntityDrawer>
    </TablePageLayout>
  );
}
