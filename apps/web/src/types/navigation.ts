import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@osgb/shared-types';

/** A navigable page. */
export interface NavLeaf {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Short module description shown on the placeholder page. */
  description: string;
  /** Required permission; the item is hidden in the sidebar and the route renders ForbiddenPage without it. */
  permission?: Permission;
}

/** A collapsible sidebar section with child pages. */
export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** URL prefix shared by all children; used for active-section detection. */
  basePath: string;
  children: NavLeaf[];
}

export type NavEntry = NavLeaf | NavSection;

export function isNavSection(entry: NavEntry): entry is NavSection {
  return 'children' in entry;
}
