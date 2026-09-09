import { Outlet, useLocation } from 'react-router';
import { usePermissions } from '@/hooks/use-permissions';
import { ForbiddenPage } from '@/pages/forbidden-page';
import { findNavLeaf } from './navigation';

/**
 * Layout route that enforces the `permission` declared on the navigation leaf matching the
 * current URL. Data-driven so routes and sidebar can never disagree.
 */
export function PermissionGate() {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const leaf = findNavLeaf(pathname);
  if (leaf?.permission && !can(leaf.permission)) return <ForbiddenPage />;
  return <Outlet />;
}
