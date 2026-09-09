import type { ReactNode } from 'react';
import type { Permission } from '@osgb/shared-types';
import { usePermissions } from '@/hooks/use-permissions';

interface CanProps {
  /** Render children only when the user holds ALL of these permissions. */
  permission?: Permission | readonly Permission[];
  /** Additionally require ANY of these. */
  anyOf?: readonly Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}

/** Declarative permission gate: <Can permission="employees.create">…</Can> */
export function Can({ permission, anyOf, fallback = null, children }: CanProps) {
  const { canAll, canAny } = usePermissions();
  const required: readonly Permission[] =
    permission === undefined ? [] : typeof permission === 'string' ? [permission] : permission;
  const allowed = canAll(required) && (anyOf ? canAny(anyOf) : true);
  return <>{allowed ? children : fallback}</>;
}
