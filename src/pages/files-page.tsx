import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Upload } from 'lucide-react';
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

function extIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLS';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'IMG';
  return 'FILE';
}

export function FilesPage() {
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
  }

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Files"
          description="Deliverables, contracts, and creative — organized by client with clear portal visibility."
          actions={
            <Button type="button" className="gap-2" onClick={() => setShowUpload((v) => !v)}>
              <Upload className="h-4 w-4" />
              Upload file
            </Button>
          }
        />
      }
    >
      {showUpload && (
        <Card className="border-indigo-100 bg-indigo-50/30 p-5 shadow-sm ring-1 ring-indigo-100/80">
          <h3 className="text-sm font-bold text-slate-900">Add a file</h3>
          <p className="mt-1 text-sm text-slate-600">Link to a client and project. You can replace the placeholder size after upload.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="File name" aria-label="File name" />
            <Select value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(''); }} aria-label="Client">
              <option value="">Client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </Select>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project" disabled={!clientId}>
              <option value="">Project…</option>
              {projectsForClient.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
        <TableToolbarSection>
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" aria-label="Search files" />
          </div>
          <Select value={folder} onChange={(e) => setFolder(e.target.value)} className="w-40 shrink-0" aria-label="Folder">
            {folders.map((f) => (
              <option key={f} value={f}>{f === 'all' ? 'All folders' : f}</option>
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
            <Button type="button" className="gap-2" onClick={() => setShowUpload(true)}>
              <Plus className="h-4 w-4" />
              Upload file
            </Button>
          }
        />
      ) : (
        <Table
          dense
          footer={<TableFooterBar from={1} to={rows.length} total={rows.length} />}
        >
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
                <TableRow key={f.id}>
                  <TableCell>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">
                      {extIcon(f.name)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium text-slate-900">{f.name}</TableCell>
                  <TableCell className="text-slate-600">{f.folder ?? 'General'}</TableCell>
                  <TableCell>
                    {cl ? <Link to={`/clients/${cl.id}`} className="text-indigo-700 hover:text-indigo-900">{cl.company}</Link> : '—'}
                  </TableCell>
                  <TableCell>
                    {pr ? <Link to={`/projects/${pr.id}`} className="text-indigo-700 hover:text-indigo-900">{pr.name}</Link> : '—'}
                  </TableCell>
                  <TableCell className="text-slate-500">{f.uploaded}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{f.size}</TableCell>
                  <TableCell>
                    <Badge variant={f.visibility === 'Client-visible' ? 'success' : 'neutral'}>{f.visibility}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu label={`Actions for ${f.name}`} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </TablePageLayout>
  );
}
