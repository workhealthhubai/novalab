import { useLocation } from 'react-router';

/** True when the location is `path` or one of its child/detail routes. */
export function useIsActivePath(path: string): boolean {
  const { pathname } = useLocation();
  return pathname === path || pathname.startsWith(`${path}/`);
}
