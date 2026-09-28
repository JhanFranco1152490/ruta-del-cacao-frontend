'use client';

import { hasPermission, type Permission } from '@/lib/permissions';

import { useSession } from './api';

export function useHasPermission(code: Permission): boolean {
  const { data: user } = useSession();
  return hasPermission(user, code);
}
