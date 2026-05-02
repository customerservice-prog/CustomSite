import type { User, UserRole } from '@/lib/types/entities';

/** GET /api/auth/me → `user` */
export type ApiAuthMeUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string | null;
};

export function mapApiAuthMeUserToStudioUser(row: ApiAuthMeUser): User {
  const email = String(row.email || '').trim();
  const name =
    row.full_name && String(row.full_name).trim()
      ? String(row.full_name).trim()
      : email.split('@')[0] || 'You';
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
