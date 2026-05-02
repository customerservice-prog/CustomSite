import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useShell } from '@/context/shell-context';
import { adminFetchJson } from '@/lib/admin-api';
import { mapApiAuthMeUserToStudioUser, type ApiAuthMeUser } from '@/lib/auth-user-map';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
];

export function AccountPage() {
  const { toast } = useShell();
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user = useAppStore((s) => s.users[currentUserId]);
  const updateUserProfile = useAppStore((s) => s.updateUserProfile);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'America/New_York');
  const [password, setPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setAvatarUrl(user.avatarUrl ?? '');
    setTimezone(user.timezone ?? 'America/New_York');
  }, [user]);

  const dirty = useMemo(
    () =>
      name !== (user?.name ?? '') ||
      email !== (user?.email ?? '') ||
      avatarUrl !== (user?.avatarUrl ?? '') ||
      timezone !== (user?.timezone ?? 'America/New_York'),
    [name, email, avatarUrl, timezone, user]
  );

  if (!user) {
    return <p className="text-sm text-slate-500">No signed-in user in this session.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="My profile"
        description="Your name, email, and preferences — separate from agency-wide Settings."
      />

      <Card className="space-y-4 p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="acct-name">
            Display name
          </label>
          <Input id="acct-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="acct-email">
            Email
          </label>
          <Input id="acct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="acct-avatar">
            Profile photo URL
          </label>
          <Input
            id="acct-avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            autoComplete="off"
          />
          <p className="mt-1 text-[11px] text-slate-500">Paste an image URL, or leave blank for initials avatar.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="acct-tz">
            Timezone
          </label>
          <Select id="acct-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="acct-pw">
            New password
          </label>
          <Input
            id="acct-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            autoComplete="new-password"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Leave blank to keep current. Password changes use Supabase Auth and are not handled on this screen yet.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            disabled={!dirty || savingProfile}
            onClick={async () => {
              const trimmedName = name.trim();
              const trimmedEmail = email.trim();
              const nameChanged = trimmedName !== (user?.name ?? '');

              if (import.meta.env.VITE_USE_REAL_API === '1' && nameChanged) {
                setSavingProfile(true);
                try {
                  const r = await adminFetchJson<{ user: ApiAuthMeUser }>('/api/auth/me', {
                    method: 'PATCH',
                    json: { full_name: trimmedName },
                  });
                  if (!r.ok) {
                    toast(r.error || 'Could not save display name.', 'error');
                    return;
                  }
                  const synced = mapApiAuthMeUserToStudioUser(r.data.user);
                  updateUserProfile(currentUserId, {
                    name: synced.name,
                    avatarUrl: avatarUrl.trim() || undefined,
                    timezone,
                    email: trimmedEmail,
                  });
                  toast(
                    trimmedEmail !== synced.email
                      ? 'Display name synced. Email is managed in Authentication, not overwritten here.'
                      : 'Profile saved.',
                    'success'
                  );
                } finally {
                  setSavingProfile(false);
                }
              } else {
                updateUserProfile(currentUserId, {
                  name: trimmedName,
                  email: trimmedEmail,
                  avatarUrl: avatarUrl.trim() || undefined,
                  timezone,
                });
                toast(
                  import.meta.env.VITE_USE_REAL_API === '1'
                    ? 'Preferences saved.'
                    : 'Profile saved locally — turn on API mode to sync display name.',
                  'success'
                );
              }

              if (password.trim()) {
                toast('Password changes use Supabase Auth — not handled on this screen yet.', 'info');
                setPassword('');
              }
            }}
          >
            {savingProfile ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
