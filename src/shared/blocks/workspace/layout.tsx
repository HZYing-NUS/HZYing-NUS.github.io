'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { Coins, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname, useRouter } from '@/core/i18n/navigation';
import {
  LocaleDetector,
  LocaleSelector,
  ThemeToggler,
} from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/shared/components/ui/sidebar';
import { useAppContext } from '@/shared/contexts/app';
import { ChatContextProvider } from '@/shared/contexts/chat';
import type { WorkspaceUser } from '@/shared/models/user';

import { WorkspaceSidebar } from './sidebar';

function WorkspaceSessionBootstrap({ user }: { user: WorkspaceUser | null }) {
  const { setIsCheckSign, setUser, fetchUserInfo } = useAppContext();

  useEffect(() => {
    setUser(user);
    setIsCheckSign(false);
    if (user) void fetchUserInfo();
  }, [fetchUserInfo, setIsCheckSign, setUser, user]);

  return null;
}

function WorkspaceNavigationTrigger() {
  const t = useTranslations('ai.chat.workspace_shell');
  const pathname = usePathname();
  const { isMobile, state } = useSidebar();

  if (!isMobile && pathname === '/') return null;
  if (!isMobile && state === 'expanded') return null;

  return (
    <SidebarTrigger
      aria-label={t('toggle_sidebar')}
      className="size-8 rounded-lg text-[#6e6e73] hover:bg-black/[0.045] dark:text-[#a1a1a6] dark:hover:bg-white/[0.07]"
    />
  );
}

function WorkspaceSearch() {
  const t = useTranslations('ai.chat.workspace_shell');
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (event.key === '/' && !isEditing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const submitSearch = () => {
    const keyword = query.trim();
    if (!keyword) return;

    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="group relative min-w-0 flex-1 sm:max-w-md"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#86868b]" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('search')}
        aria-label={t('search')}
        className="h-9 rounded-xl border-black/[0.08] bg-black/[0.025] pr-10 pl-10 text-sm shadow-none hover:border-black/[0.12] hover:bg-black/[0.045] focus-visible:border-black/[0.15] focus-visible:ring-0 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/15 dark:hover:bg-white/[0.07] dark:focus-visible:border-white/20"
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border border-black/[0.08] bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-[#86868b] transition-opacity group-focus-within:opacity-0 xl:inline dark:border-white/10 dark:bg-white/[0.05] dark:text-[#98989d]">
        /
      </span>
    </form>
  );
}

function WorkspaceFrame({
  children,
  initialUser,
  officialProfileUsername,
}: {
  children: ReactNode;
  initialUser: WorkspaceUser | null;
  officialProfileUsername?: string | null;
}) {
  const t = useTranslations('ai.chat.workspace_shell');
  const pathname = usePathname();
  const pageTitle =
    pathname === '/'
      ? t('home')
      : pathname.startsWith('/chat/projects')
        ? t('projects')
        : pathname.startsWith('/chat/history')
          ? t('chat_history')
          : pathname.startsWith('/chat/credits')
            ? t('credit')
            : pathname.startsWith('/chat/memories')
              ? t('memory')
              : pathname.startsWith('/chat/skills')
                ? t('skills')
                : pathname.startsWith('/resources')
                  ? t('resources')
                  : pathname.startsWith('/collections')
                    ? t('collections')
                    : pathname.startsWith('/blog')
                      ? t('articles')
                      : pathname.startsWith('/search')
                        ? t('search_title')
                        : t('assistant');

  return (
    <>
      <WorkspaceSessionBootstrap user={initialUser} />
      <SidebarProvider
        defaultOpen={pathname !== '/'}
        className="[--sidebar-accent:#e7edf7] [--sidebar-border:#e1e4e9] [--sidebar-foreground:#1d1d1f] [--sidebar:#f5f5f7] dark:[--sidebar-accent:#282d38] dark:[--sidebar-border:#30333a] dark:[--sidebar-foreground:#f5f5f7] dark:[--sidebar:#17181b]"
        style={
          {
            '--sidebar-width': '19.5rem',
            '--sidebar-width-icon': '4.5rem',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
          } as React.CSSProperties
        }
      >
        <WorkspaceSidebar officialProfileUsername={officialProfileUsername} />
        <LocaleDetector />
        <SidebarInset className="min-w-0 overflow-hidden">
          <div className="flex min-h-dvh min-w-0 flex-col bg-[#f7f7f8] text-[#1d1d1f] dark:bg-[#111216] dark:text-[#f5f5f7]">
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-black/[0.07] bg-white/88 px-3 backdrop-blur-xl md:px-5 dark:border-white/10 dark:bg-[#16171a]/88">
              <WorkspaceNavigationTrigger />
              <span className="mr-2 hidden min-w-20 text-sm font-medium tracking-[-0.01em] text-[#3a3a3c] lg:block dark:text-[#e5e5e7]">
                {pageTitle}
              </span>
              <WorkspaceSearch />
              <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
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
                <ThemeToggler type="menu" />
                <LocaleSelector type="button" />
              </div>
            </header>
            <div className="min-h-0 min-w-0 flex-1">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

export function WorkspaceLayout({
  children,
  initialUser,
  officialProfileUsername,
}: {
  children: ReactNode;
  initialUser: WorkspaceUser | null;
  officialProfileUsername?: string | null;
}) {
  return (
    <ChatContextProvider>
      <WorkspaceFrame
        initialUser={initialUser}
        officialProfileUsername={officialProfileUsername}
      >
        {children}
      </WorkspaceFrame>
    </ChatContextProvider>
  );
}

export function ChatWorkspaceLayout({
  children,
  initialUser,
  officialProfileUsername,
}: {
  children: ReactNode;
  initialUser: WorkspaceUser | null;
  officialProfileUsername?: string | null;
}) {
  return (
    <ChatContextProvider>
      <WorkspaceFrame
        initialUser={initialUser}
        officialProfileUsername={officialProfileUsername}
      >
        {children}
      </WorkspaceFrame>
    </ChatContextProvider>
  );
}
