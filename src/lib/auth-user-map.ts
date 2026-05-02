import type { User, UserRole } from '@/lib/types/entities';

/** GET /api/auth/me → `user` */
export type ApiAuthMeUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string | null;
};

/** Mirrors server `displayNameFromEmail` — avoids showing another actor when `full_name` is null */
export function greetingNameFromEmail(email: string): string {
  const local = String(email || '').trim().split('@')[0];
  if (!local) return 'You';
  const m = local.match(/^([a-zA-Z]{2,})/);
  if (m)
    return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function mapApiAuthMeUserToStudioUser(row: ApiAuthMeUser): User {
  const email = String(row.email || '').trim();
  const name =
    row.full_name && String(row.full_name).trim()
      ? String(row.full_name).trim()
      : greetingNameFromEmail(email) || 'You';
  const roleRaw = String(row.role || '').toLowerCase();
  const role: UserRole = roleRaw === 'admin' ? 'admin' : roleRaw === 'member' ? 'member' : 'client';
  return {
    id: row.id,
    name,
    email,
    role,
    createdAt: row.created_at || new Date().toISOString(),
  };
}
