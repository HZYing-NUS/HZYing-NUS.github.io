import { ReactNode } from 'react';

import { ChatWorkspaceLayout } from '@/shared/blocks/workspace/layout';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatWorkspaceLayout>{children}</ChatWorkspaceLayout>;
}
