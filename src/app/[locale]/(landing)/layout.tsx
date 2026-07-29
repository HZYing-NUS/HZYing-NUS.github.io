import { ReactNode } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';

import { PublicLandingShell } from '@/shared/blocks/landing/public-shell';
import { WorkspaceLayout } from '@/shared/blocks/workspace/layout';
import { getSignUser } from '@/shared/models/user';

export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-pathname') || '';
  const normalizedPath = pathname.replace(/^\/(en|zh)(?=\/|$)/, '') || '/';
  if (normalizedPath === '/') return <>{children}</>;

  const hasSession = requestHeaders.get('x-session-present') === '1';
  if (!hasSession) return <PublicLandingShell>{children}</PublicLandingShell>;

  noStore();
  const user = await getSignUser();

  return user ? (
    <WorkspaceLayout>{children}</WorkspaceLayout>
  ) : (
    <PublicLandingShell>{children}</PublicLandingShell>
  );
}
