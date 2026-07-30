'use client';

import { useEffect, type ReactNode } from 'react';
import { Coins, Search } from 'lucide-react';
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
    buttons: [
      {
        title: t('new_chat'),
        icon: 'Plus',
        url: '/chat',
        variant: 'outline',
      },
    ],
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
      <DashboardLayout
        sidebar={sidebar}
        className="[--sidebar-accent:#e8edf7] [--sidebar-border:#dfe3ea] [--sidebar-foreground:#1d1d1f] [--sidebar:#f5f5f7] dark:[--sidebar-accent:#252933] dark:[--sidebar-border:#30333a] dark:[--sidebar-foreground:#f5f5f7] dark:[--sidebar:#17181b]"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
        }}
      >
        <LocaleDetector />
        <div className="flex min-h-dvh min-w-0 flex-col bg-[#f7f7f8] text-[#1d1d1f] dark:bg-[#101114] dark:text-[#f5f5f7]">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-black/[0.07] bg-white/85 px-3 backdrop-blur-xl md:px-5 dark:border-white/10 dark:bg-[#16171a]/85">
            <SidebarTrigger className="size-8 rounded-lg" />
            <Button
              variant="outline"
              size="sm"
              asChild
              className="ml-1 hidden h-8 min-w-52 justify-start rounded-lg border-black/[0.08] bg-black/[0.025] px-3 text-[#6e6e73] shadow-none hover:bg-black/[0.05] sm:flex dark:border-white/10 dark:bg-white/[0.04] dark:text-[#a1a1a6] dark:hover:bg-white/[0.07]"
            >
              <Link href="/search" aria-label={t('search')} title={t('search')}>
                <Search className="size-4" />
                <span className="truncate">{t('search')}</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="size-8 rounded-lg sm:hidden"
            >
              <Link href="/search" aria-label={t('search')} title={t('search')}>
                <Search className="size-4" />
              </Link>
            </Button>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 rounded-lg px-2.5"
              >
                <Link href="/chat/credits">
                  <Coins className="size-4" />
                  <span>{t('credit')}</span>
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
      <WorkspaceFrame initialUser={initialUser} showChatLibrary>
        {children}
      </WorkspaceFrame>
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
