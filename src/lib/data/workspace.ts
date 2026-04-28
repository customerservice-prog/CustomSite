import type { User, Workspace } from '@/lib/types/entities';

export const workspaceSeed: Workspace = {
  id: 'w1',
  name: 'CustomSite Studio',
  slug: 'customsite-studio',
  createdAt: '2024-01-15T12:00:00.000Z',
};

export const usersSeed: User[] = [
  {
    id: 'u1',
    name: 'Jordan Blake',
    email: 'jordan@customsite.online',
    role: 'admin',
    createdAt: '2024-01-15T12:00:00.000Z',
  },
  {
    id: 'u2',
    name: 'Alex Chen',
    email: 'alex@customsite.online',
    role: 'member',
    createdAt: '2024-01-15T12:00:00.000Z',
  },
  {
    id: 'u3',
    name: 'Riley Morgan',
    email: 'riley@customsite.online',
    role: 'member',
    createdAt: '2024-01-15T12:00:00.000Z',
  },
];

export function teamByIdFrom(users: Record<string, User>, id: string) {
  return users[id];
}
