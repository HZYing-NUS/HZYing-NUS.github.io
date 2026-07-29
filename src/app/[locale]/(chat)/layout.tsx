import { ReactNode } from 'react';

import { ChatWorkspaceLayout } from '@/shared/blocks/workspace/layout';
import { getSignUser, getUserCredits } from '@/shared/models/user';

export default async function ChatLayout({
  children,
}: {
  children: ReactNode;
}) {
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

  return (
    <ChatWorkspaceLayout initialUser={initialUser}>
      {children}
    </ChatWorkspaceLayout>
  );
}
