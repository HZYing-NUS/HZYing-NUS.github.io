import { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

import { Sidebar } from './sidebar';

export function DashboardLayout({
  children,
  sidebar,
  className,
  style,
}: {
  children: ReactNode;
  sidebar: SidebarType;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <SidebarProvider
      className={className}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 64)',
          '--header-height': 'calc(var(--spacing) * 14)',
          ...style,
        } as React.CSSProperties
      }
    >
      {sidebar && (
        <Sidebar variant={sidebar.variant || 'inset'} sidebar={sidebar} />
      )}
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
