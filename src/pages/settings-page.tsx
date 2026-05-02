import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useBuildHelperStore } from '@/store/use-build-helper-store';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/modal';
import type { User, UserRole } from '@/lib/types/entities';

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

type SettingsForm = {
  companyName: string;
  publicUrl: string;
  address: string;
  brandPrimary: string;
  brandRadius: string;
  teamDefaultOwner: string;
  billingTax: string;
  billingCurrency: string;
  portalDomain: string;
  emailInvoices: boolean;
  slackDigest: boolean;
  portalFiles: boolean;
  mfa: boolean;
};

const SETTINGS_INITIAL: SettingsForm = {
  companyName: 'CustomSite Studio LLC',
  publicUrl: 'https://customsite.online',
  address: '123 Market Street\nSyracuse, NY 13202',
  brandPrimary: '#4F46E5',
  brandRadius: '16',
  teamDefaultOwner: 'u1',
  billingTax: 'Sales tax (NY)',
  billingCurrency: 'usd',
  portalDomain: 'clients.customsite.online',
  emailInvoices: true,
  slackDigest: false,
  portalFiles: true,
  mfa: false,
};

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

function roleLabel(role: UserRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'member') return 'Editor';
  return 'Viewer';
}

function seatLabel(u: User): string {
  if (u.id === 'u1') return 'Owner';
  return roleLabel(u.role);
}

export function SettingsPage() {
  const { toast } = useShell();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabSearchParam = searchParams.get('tab');
  const users = useAppStore(useShallow((s) => Object.values(s.users ?? {})));
  const teamMembers = useMemo(
    () => users.filter((u): u is User => Boolean(u && u.role && u.role !== 'client')),
    [users],
  );
  const buildHelperEnabled = useBuildHelperStore((s) => s.enabled);
  const setBuildHelperEnabled = useBuildHelperStore((s) => s.setEnabled);
  const setHelperPanelCollapsed = useBuildHelperStore((s) => s.setPanelCollapsed);
  const [tab, setTab] = useState<string>(TABS[0].id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [pendingInvites, setPendingInvites] = useState<{ id: string; email: string; role: UserRole }[]>([]);

  useEffect(() => {
    if (tabSearchParam && TABS.some((x) => x.id === tabSearchParam)) setTab(tabSearchParam);
  }, [tabSearchParam]);

  function setTabAndUrl(next: string) {
    setTab(next);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === 'general') p.delete('tab');
      else p.set('tab', next);
      return p;
    });
  }

  const weeklyInviteLink = useMemo(() => {
    const week = Math.floor(Date.now() / (7 * 86400000));
    const token = `cs-${week.toString(36)}-${Math.floor(Date.now() / 86400000).toString(36)}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${typeof window !== 'undefined' ? window.location.pathname : ''}#/join?token=${token}`;
  }, []);
  const [saved, setSaved] = useState<SettingsForm>(() => ({ ...SETTINGS_INITIAL }));
  const [form, setForm] = useState<SettingsForm>(() => ({ ...SETTINGS_INITIAL }));
  const [saveFlash, setSaveFlash] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  function save() {
    if (!dirty) {
      toast('No changes to save.', 'info');
      return;
    }
    setSaved({ ...form });
    toast('Settings saved.', 'success');
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 2200);
  }

  return (
    <div id="settings-page-root" className="space-y-8">
      <PageHeader
        title="Settings"
        description="Defaults for billing, brand, team, portal, and security — save when you change something."
        actions={
          <Button
            type="button"
            onClick={save}
            className={saveFlash ? 'bg-emerald-600 hover:bg-emerald-600' : undefined}
          >
            {saveFlash ? 'Saved' : 'Save changes'}
          </Button>
        }
      />

      <SettingsLayout tabs={[...TABS]} activeTab={tab} onTabChange={setTabAndUrl}>
        {tab === 'general' && (
          <div className="space-y-6">
            <Card
              className={`border p-5 shadow-sm ${buildHelperEnabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/50'}`}
            >
              <p className="text-sm font-bold text-slate-900">Build Helper — guided first client build</p>
              <p className="mt-1 text-sm text-slate-600">
                {buildHelperEnabled
                  ? 'The right-side checklist is on. Collapse it anytime from the header or here.'
                  : 'Build Helper is off — turn it on for a step-by-step checklist your whole team can follow (no extra popups).'}
              </p>
              <div className="mt-4 border-t border-slate-200/60 pt-4">
                <ToggleRow
                  label="Enable Build Helper"
                  description="Right-side checklist for onboarding new team members."
                  on={buildHelperEnabled}
                  onToggle={() => {
                    const next = !buildHelperEnabled;
                    setBuildHelperEnabled(next);
                    if (next) setHelperPanelCollapsed(false);
                  }}
                />
              </div>
            </Card>
            <SectionHeader title="Agency profile" description="Legal name and defaults shown on invoices and contracts." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ws-name">
                  Company name
                </label>
                <Input
                  id="ws-name"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ws-url">
                  Public URL
                </label>
                <Input
                  id="ws-url"
                  value={form.publicUrl}
                  onChange={(e) => setForm((f) => ({ ...f, publicUrl: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="ws-addr">
                Address
              </label>
              <Textarea
                id="ws-addr"
                className="min-h-[88px]"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
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
                <Input
                  id="brand-primary"
                  value={form.brandPrimary}
                  onChange={(e) => setForm((f) => ({ ...f, brandPrimary: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="brand-radius">
                  Corner radius
                </label>
                <Select
                  id="brand-radius"
                  value={form.brandRadius}
                  onChange={(e) => setForm((f) => ({ ...f, brandRadius: e.target.value }))}
                >
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
            <SectionHeader title="Team" description="Invite employees, assign roles, and copy the current join link." />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setInviteOpen(true)}>
                + Invite team member
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(weeklyInviteLink).then(
                    () => toast('Invite link copied — rotates weekly.', 'success'),
                    () => toast(weeklyInviteLink, 'info')
                  );
                }}
              >
                Copy invite link
              </Button>
            </div>
            <Card className="overflow-hidden p-0 shadow-sm ring-1 ring-slate-900/[0.04]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamMembers.map((u: User) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3 text-slate-700">{seatLabel(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            {pendingInvites.length > 0 ? (
              <Card className="p-4 text-sm text-slate-700">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pending invites</p>
                <ul className="mt-2 space-y-1">
                  {pendingInvites.map((p) => (
                    <li key={p.id}>
                      {p.email} · {roleLabel(p.role)}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
            <Card className="p-4 text-xs text-slate-500">
              Invite links rotate weekly. SCIM directory sync is available on Enterprise.
            </Card>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="default-owner">
                Default project owner
              </label>
              <Select
                id="default-owner"
                value={form.teamDefaultOwner}
                onChange={(e) => setForm((f) => ({ ...f, teamDefaultOwner: e.target.value }))}
              >
                <option value="u1">Jordan Blake</option>
                <option value="u2">Alex Chen</option>
                <option value="u3">Riley Morgan</option>
              </Select>
            </div>
            {inviteOpen ? (
              <Modal open={inviteOpen} title="Invite team member" onClose={() => setInviteOpen(false)}>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="inv-email">
                      Email
                    </label>
                    <Input
                      id="inv-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@agency.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="inv-role">
                      Role
                    </label>
                    <Select id="inv-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}>
                      <option value="admin">Admin</option>
                      <option value="member">Editor</option>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (!inviteEmail.includes('@')) {
                          toast('Enter a valid email.', 'error');
                          return;
                        }
                        setPendingInvites((prev) => [
                          ...prev,
                          { id: `inv-${Date.now()}`, email: inviteEmail.trim(), role: inviteRole },
                        ]);
                        toast('Invite queued — connect email delivery to send in production.', 'success');
                        setInviteEmail('');
                        setInviteRole('member');
                        setInviteOpen(false);
                      }}
                    >
                      Send invite
                    </Button>
                  </div>
                </div>
              </Modal>
            ) : null}
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
                <Input
                  id="tax"
                  value={form.billingTax}
                  onChange={(e) => setForm((f) => ({ ...f, billingTax: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="currency">
                  Currency
                </label>
                <Select
                  id="currency"
                  value={form.billingCurrency}
                  onChange={(e) => setForm((f) => ({ ...f, billingCurrency: e.target.value }))}
                >
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
              on={form.emailInvoices}
              onToggle={() => setForm((f) => ({ ...f, emailInvoices: !f.emailInvoices }))}
            />
            <ToggleRow
              label="Slack digest"
              description="Daily pipeline + tasks summary."
              on={form.slackDigest}
              onToggle={() => setForm((f) => ({ ...f, slackDigest: !f.slackDigest }))}
            />
          </div>
        )}

        {tab === 'portal' && (
          <div>
            <SectionHeader title="Client experience" description="What clients can see and approve." />
            <ToggleRow
              label="Files & deliverables"
              description="Allow downloads and version history."
              on={form.portalFiles}
              onToggle={() => setForm((f) => ({ ...f, portalFiles: !f.portalFiles }))}
            />
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="portal-domain">
                Portal domain
              </label>
              <Input
                id="portal-domain"
                value={form.portalDomain}
                onChange={(e) => setForm((f) => ({ ...f, portalDomain: e.target.value }))}
              />
            </div>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {['Calendly', 'Google Workspace', 'QuickBooks', 'Webhooks'].map((name) => (
              <Card key={name} className="border-dashed border-slate-200 p-5 transition hover:border-indigo-200">
                <h3 className="font-bold text-slate-900">{name}</h3>
                <p className="mt-1 text-sm text-slate-500">Not connected — complete OAuth to enable sync.</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
                  onClick={() => {
                    toast(`${name}: preparing sign-in…`, 'info');
                    window.setTimeout(() => {
                      const demoUrl =
                        name === 'Calendly'
                          ? 'https://calendly.com/oauth/connect'
                          : name === 'Google Workspace'
                            ? 'https://accounts.google.com/o/oauth2/v2/auth'
                            : name === 'QuickBooks'
                              ? 'https://appcenter.intuit.com/connect/oauth2'
                              : 'https://example.com/oauth-demo';
                      const w = window.open(demoUrl, `${name}-oauth`, 'noopener,noreferrer,width=520,height=720');
                      if (!w) {
                        toast('Popup was blocked — allow popups for this site, then try Connect again.', 'error');
                        return;
                      }
                      toast(`${name}: finish sign-in in the new window.`, 'success');
                    }, 0);
                  }}
                >
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
              description="Applies to billing and agency defaults."
              on={form.mfa}
              onToggle={() => setForm((f) => ({ ...f, mfa: !f.mfa }))}
            />
            <Card className="mt-6 p-4 text-sm text-slate-600">
              Session length, IP allowlists, and audit export hook to your identity provider.
            </Card>
          </div>
        )}

        <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
          <Button
            type="button"
            onClick={save}
            className={saveFlash ? 'bg-emerald-600 hover:bg-emerald-600' : undefined}
          >
            {saveFlash ? 'Saved' : 'Save changes'}
          </Button>
        </div>
      </SettingsLayout>
    </div>
  );
}
