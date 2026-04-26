import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { SettingsLayout } from '@/components/layout/templates/settings-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'team', label: 'Team' },
  { id: 'billing', label: 'Billing' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'portal', label: 'Client Portal' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'security', label: 'Security' },
] as const;

function ToggleRow({
  label,
  description,
  on,
  onToggle,
}: {
  label: string;
  description: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          on ? 'bg-indigo-600' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition duration-200',
            on ? 'left-7' : 'left-1'
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { toast } = useShell();
  const [tab, setTab] = useState<string>(TABS[0].id);
  const [emailInvoices, setEmailInvoices] = useState(true);
  const [slackDigest, setSlackDigest] = useState(false);
  const [portalFiles, setPortalFiles] = useState(true);
  const [mfa, setMfa] = useState(false);

  function save() {
    toast('Settings saved.', 'success');
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Workspace defaults, brand, billing, and how clients experience your portal."
        actions={
          <Button type="button" onClick={save}>
            Save changes
          </Button>
        }
      />

      <SettingsLayout tabs={[...TABS]} activeTab={tab} onTabChange={setTab}>
        {tab === 'general' && (
          <div className="space-y-6">
            <SectionHeader title="Workspace" description="Legal name and defaults shown on documents." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ws-name">
                  Company name
                </label>
                <Input id="ws-name" defaultValue="Acme Agency LLC" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ws-url">
                  Public URL
                </label>
                <Input id="ws-url" defaultValue="https://acme.agency" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ws-addr">
                Address
              </label>
              <Textarea id="ws-addr" className="min-h-[88px]" defaultValue="123 Market Street&#10;Syracuse, NY 13202" />
            </div>
          </div>
        )}

        {tab === 'branding' && (
          <div className="space-y-6">
            <SectionHeader title="Visual identity" description="Used on proposals, invoices, and the client portal." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="brand-primary">
                  Primary color
                </label>
                <Input id="brand-primary" defaultValue="#4F46E5" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="brand-radius">
                  Corner radius
                </label>
                <Select id="brand-radius" defaultValue="16">
                  <option value="12">12px</option>
                  <option value="16">16px</option>
                  <option value="20">20px</option>
                </Select>
              </div>
            </div>
            <Card className="border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
              Upload your logo for invoices, proposals, and the client portal.
            </Card>
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-6">
            <SectionHeader title="Members" description="Roles, seats, and audit visibility." />
            <Card className="p-4 text-sm text-slate-600">
              Invite links and SCIM sync ship when you wire your auth provider.
            </Card>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="default-owner">
                Default project owner
              </label>
              <Select id="default-owner" defaultValue="u1">
                <option value="u1">Jordan Blake</option>
                <option value="u2">Alex Chen</option>
                <option value="u3">Riley Morgan</option>
              </Select>
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="space-y-6">
            <SectionHeader title="Plans & usage" description="Connect Stripe for subscriptions and invoice payouts." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="tax">
                  Default tax label
                </label>
                <Input id="tax" defaultValue="Sales tax (NY)" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="currency">
                  Currency
                </label>
                <Select id="currency" defaultValue="usd">
                  <option value="usd">USD</option>
                  <option value="cad">CAD</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div>
            <SectionHeader title="Alerts" description="Choose what hits your inbox versus in-app." />
            <ToggleRow
              label="Invoice events"
              description="Paid, overdue, and partial payments."
              on={emailInvoices}
              onToggle={() => setEmailInvoices((v) => !v)}
            />
            <ToggleRow
              label="Slack digest"
              description="Daily pipeline + tasks summary."
              on={slackDigest}
              onToggle={() => setSlackDigest((v) => !v)}
            />
          </div>
        )}

        {tab === 'portal' && (
          <div>
            <SectionHeader title="Client experience" description="What clients can see and approve." />
            <ToggleRow
              label="Files & deliverables"
              description="Allow downloads and version history."
              on={portalFiles}
              onToggle={() => setPortalFiles((v) => !v)}
            />
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="portal-domain">
                Portal domain
              </label>
              <Input id="portal-domain" defaultValue="clients.acme.agency" />
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {['Calendly', 'Google Workspace', 'QuickBooks', 'Webhooks'].map((name) => (
              <Card key={name} className="border-dashed border-slate-200 p-5 transition hover:border-indigo-200">
                <h3 className="font-bold text-slate-900">{name}</h3>
                <p className="mt-1 text-sm text-slate-500">Not connected — OAuth flow placeholder.</p>
                <Button type="button" variant="secondary" className="mt-4">
                  Connect
                </Button>
              </Card>
            ))}
          </div>
        )}

        {tab === 'security' && (
          <div>
            <SectionHeader title="Access" description="Protect firm and client data." />
            <ToggleRow
              label="Require MFA for admins"
              description="Applies to billing and workspace settings."
              on={mfa}
              onToggle={() => setMfa((v) => !v)}
            />
            <Card className="mt-6 p-4 text-sm text-slate-600">
              Session length, IP allowlists, and audit export hook to your identity provider.
            </Card>
          </div>
        )}

        <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
          <Button type="button" onClick={save}>
            Save changes
          </Button>
        </div>
      </SettingsLayout>
    </div>
  );
}
