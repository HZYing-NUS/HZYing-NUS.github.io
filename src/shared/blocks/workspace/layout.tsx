'use client';

import { useEffect, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { ChatLibrary } from '@/shared/blocks/chat/library';
import { LocaleDetector, LocaleSelector } from '@/shared/blocks/common';
import { DashboardLayout } from '@/shared/blocks/dashboard';
import { Button } from '@/shared/components/ui/button';
import { SidebarTrigger } from '@/shared/components/ui/sidebar';
import { useAppContext } from '@/shared/contexts/app';
import { ChatContextProvider } from '@/shared/contexts/chat';
import type { WorkspaceUser } from '@/shared/models/user';
import type { Sidebar } from '@/shared/types/blocks/dashboard';

function WorkspaceSessionBootstrap({ user }: { user: WorkspaceUser | null }) {
  const { setIsCheckSign, setUser, fetchUserInfo } = useAppContext();

  useEffect(() => {
    setUser(user);
    setIsCheckSign(false);
    if (user) void fetchUserInfo();
  }, [fetchUserInfo, setIsCheckSign, setUser, user]);

  return null;
}

function WorkspaceFrame({
  children,
  initialUser,
  showChatLibrary = false,
}: {
  children: ReactNode;
  initialUser: WorkspaceUser | null;
  showChatLibrary?: boolean;
}) {
  const t = useTranslations('ai.chat.workspace_shell');

  const sidebar: Sidebar = {
    header: {
      brand: {
        title: 'WebTools',
        logo: { src: '/logo.png', alt: 'WebTools' },
        url: '/',
      },
      show_trigger: false,
    },
    buttons: showChatLibrary
      ? [
          {
            title: t('new_chat'),
            icon: 'Plus',
            url: '/chat',
            variant: 'outline',
          },
        ]
      : [],
    main_navs: [
      {
        items: [
          { title: t('assistant'), icon: 'MessageSquareText', url: '/' },
          { title: t('projects'), icon: 'FolderKanban', url: '/chat/projects' },
          { title: t('resources'), icon: 'Boxes', url: '/resources' },
          { title: t('collections'), icon: 'ListChecks', url: '/collections' },
          { title: t('articles'), icon: 'Newspaper', url: '/blog' },
        ],
      },
    ],
    library: showChatLibrary ? <ChatLibrary /> : undefined,
    bottom_nav: {
      items: [{ title: t('submit'), icon: 'Send', url: '/submit' }],
    },
    user: {
      nav: {
        items: [
          {
            title: t('edit_public_profile'),
            url: '/settings/profile',
            icon: 'UserRoundPen',
          },
          {
            title: t('account_settings'),
            url: '/settings/security',
            icon: 'Settings',
          },
        ],
      },
      show_email: false,
      show_signout: true,
      signout_callback: '/',
      signin_callback: '/',
    },
    variant: 'sidebar',
    collapsible: 'icon',
  };

  return (
    <>
      <WorkspaceSessionBootstrap user={initialUser} />
      <DashboardLayout sidebar={sidebar}>
        <LocaleDetector />
        <div className="bg-background text-foreground flex min-h-dvh min-w-0 flex-col">
          <header className="bg-background/92 border-border sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-5">
            <SidebarTrigger className="size-8" />
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-muted-foreground ml-1"
            >
              <Link href="/search" aria-label={t('search')} title={t('search')}>
                <Search className="size-4" />
              </Link>
            </Button>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/chat/credits">
                  <span className="hidden sm:inline">{t('credit')}</span>
                  <span className="sm:hidden">Credit</span>
                </Link>
              </Button>
              <LocaleSelector type="button" />
            </div>
          </header>
          <div className="min-h-0 min-w-0 flex-1">{children}</div>
        </div>
      </DashboardLayout>
    </>
  );
}

export function WorkspaceLayout({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: WorkspaceUser | null;
}) {
  return (
    <ChatContextProvider>
      <WorkspaceFrame initialUser={initialUser}>{children}</WorkspaceFrame>
    </ChatContextProvider>
  );
}

export function ChatWorkspaceLayout({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: WorkspaceUser | null;
}) {
  return (
    <ChatContextProvider>
      <WorkspaceFrame initialUser={initialUser} showChatLibrary>
        {children}
      </WorkspaceFrame>
    </ChatContextProvider>
  );
}
