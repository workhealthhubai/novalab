import { fireEvent, render, screen } from '@testing-library/react';
import { Settings } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { NavSection as NavSectionConfig } from '@/types/navigation';
import { NavSection } from './nav-section';

const section: NavSectionConfig = {
  id: 'settings',
  label: 'Genel Ayarlar',
  icon: Settings,
  basePath: '/settings',
  children: Array.from({ length: 12 }, (_, i) => ({
    label: `Ayar ${i + 1}`,
    icon: Settings,
    path: `/settings/item-${i + 1}`,
    description: 'Ayar',
  })),
};

describe('NavSection (collapsed rail)', () => {
  it('opens a flyout that is height-bounded and scrollable', async () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <NavSection section={section} collapsed />
        </TooltipProvider>
      </MemoryRouter>,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Genel Ayarlar' }));
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveClass('overflow-y-auto');
    expect(menu.className).toContain('--radix-dropdown-menu-content-available-height');
    expect(screen.getAllByRole('menuitem')).toHaveLength(12);
  });
});
