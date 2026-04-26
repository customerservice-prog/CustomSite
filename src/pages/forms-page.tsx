import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { formsSeed, type FormRow } from '@/lib/data/module-seeds';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useClients } from '@/store/hooks';
import { DataRowMenu } from '@/components/workspace/data-row-menu';

function formVariant(s: FormRow['status']): 'neutral' | 'success' | 'info' | 'warning' {
  if (s === 'Live') return 'success';
  if (s === 'Draft') return 'warning';
  return 'neutral';
}

export function FormsPage() {
  const [rows, setRows] = useState<FormRow[]>(() => [...formsSeed]);
  const clients = useClients();

  function addForm() {
    setRows((prev) => [
      {
        id: `fm-${Date.now()}`,
        name: 'New intake form',
        status: 'Draft',
        responses: 0,
        clientId: null,
        updatedLabel: 'Just now',
      },
      ...prev,
    ]);
  }

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Forms"
          description="Client intake, approvals, and structured data collection — embed on the portal or share a secure link."
          actions={
            <Button type="button" className="gap-2" onClick={addForm}>
              <Plus className="h-4 w-4" />
              New form
            </Button>
          }
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No forms yet"
          description="Build branded questionnaires with routing rules. Responses land beside the right client and project."
          action={
            <Button type="button" className="gap-2" onClick={addForm}>
              <Plus className="h-4 w-4" />
              New form
            </Button>
          }
        />
      ) : (
        <Table dense footer={<TableFooterBar from={1} to={rows.length} total={rows.length} />}>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell>Form</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Responses</TableHeadCell>
              <TableHeadCell>Linked client</TableHeadCell>
              <TableHeadCell>Updated</TableHeadCell>
              <TableHeadCell className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const cl = r.clientId ? clients.find((c) => c.id === r.clientId) : undefined;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                  <TableCell>
                    <Badge variant={formVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{r.responses}</TableCell>
                  <TableCell>
                    {cl ? <Link to={`/clients/${cl.id}`} className="text-indigo-700 hover:text-indigo-900">{cl.company}</Link> : '—'}
                  </TableCell>
                  <TableCell className="text-slate-500">{r.updatedLabel}</TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu label={`Actions for ${r.name}`} />
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
