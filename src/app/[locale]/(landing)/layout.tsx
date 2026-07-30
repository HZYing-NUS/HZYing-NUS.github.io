import { ReactNode } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';

import { envConfigs } from '@/config';
import { PublicLandingShell } from '@/shared/blocks/landing/public-shell';
import { WorkspaceLayout } from '@/shared/blocks/workspace/layout';
import { getSignUser, getUserCredits } from '@/shared/models/user';

export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();
  const hasSession = requestHeaders.get('x-session-present') === '1';
  if (!hasSession) return <PublicLandingShell>{children}</PublicLandingShell>;

  noStore();
  const user = await getSignUser();
  const initialUser = user
    ? {
        ...user,
        credits: {
          ...(await getUserCredits(user.id)),
          expiresAt: null,
        },
      }
    : null;

  return initialUser ? (
    <WorkspaceLayout
      initialUser={initialUser}
      officialProfileUsername={envConfigs.community_about_username}
    >
      {children}
    </WorkspaceLayout>
  ) : (
    <PublicLandingShell>{children}</PublicLandingShell>
  );
}
