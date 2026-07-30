'use client';

import { useEffect, useRef, type ComponentType } from 'react';
import Image from 'next/image';
import {
  Blocks,
  Boxes,
  Brain,
  Coins,
  FolderKanban,
  History,
  Home,
  LibraryBig,
  ListChecks,
  MessageSquareText,
  Newspaper,
  PanelLeftClose,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/core/i18n/navigation';
import { ChatLibrary } from '@/shared/blocks/chat/library';
import { SidebarUser } from '@/shared/blocks/dashboard/sidebar-user';
import { Button } from '@/shared/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from '@/shared/components/ui/sidebar';
import { cn } from '@/shared/lib/utils';

type WorkspaceModule = 'home' | 'assistant' | 'knowledge';

type NavigationItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

function resolveModule(pathname: string): WorkspaceModule {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/chat')) return 'assistant';
  return 'knowledge';
}

function isPathActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/chat') {
    return (
      pathname === '/chat' ||
      /^\/chat\/(?!projects(?:\/|$)|history(?:\/|$)|skills(?:\/|$)|credits(?:\/|$)|memories(?:\/|$))/.test(
        pathname
      )
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceSidebar({
  officialProfileUsername,
}: {
  officialProfileUsername?: string | null;
}) {
  const t = useTranslations('ai.chat.workspace_shell');
  const pathname = usePathname();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const previousPathname = useRef(pathname);
  const activeModule = resolveModule(pathname);

  useEffect(() => {
    if (previousPathname.current === '/' && pathname.startsWith('/chat')) {
      setOpen(true);
    }
    previousPathname.current = pathname;
  }, [pathname, setOpen]);

  const modules: Array<{
    id: WorkspaceModule;
    title: string;
    href: string;
    icon: NavigationItem['icon'];
  }> = [
    { id: 'home', title: t('home'), href: '/', icon: Home },
    {
      id: 'assistant',
      title: t('assistant_short'),
      href: '/chat',
      icon: MessageSquareText,
    },
    {
      id: 'knowledge',
      title: t('knowledge'),
      href: '/resources',
      icon: LibraryBig,
    },
  ];

  const assistantItems: NavigationItem[] = [
    { title: t('projects'), href: '/chat/projects', icon: FolderKanban },
    { title: t('chat_history'), href: '/chat/history', icon: History },
    { title: t('skills'), href: '/chat/skills', icon: Blocks },
    { title: t('memory'), href: '/chat/memories', icon: Brain },
    { title: t('credit'), href: '/chat/credits', icon: Coins },
  ];
  const knowledgeItems: NavigationItem[] = [
    { title: t('search_title'), href: '/search', icon: Search },
    { title: t('resources'), href: '/resources', icon: Boxes },
    { title: t('collections'), href: '/collections', icon: ListChecks },
    { title: t('articles'), href: '/blog', icon: Newspaper },
    { title: t('submit'), href: '/submit', icon: Send },
  ];
  const homeItems: NavigationItem[] = [
    { title: t('assistant'), href: '/chat', icon: MessageSquareText },
    { title: t('projects'), href: '/chat/projects', icon: FolderKanban },
    { title: t('resources'), href: '/resources', icon: Boxes },
  ];
  const panelItems =
    activeModule === 'assistant'
      ? assistantItems
      : activeModule === 'knowledge'
        ? knowledgeItems
        : homeItems;
  const panelTitle =
    activeModule === 'assistant'
      ? t('assistant')
      : activeModule === 'knowledge'
        ? t('knowledge_and_action')
        : t('home');

  const handleNavigation = (openDesktop: boolean) => {
    if (isMobile) {
      setOpenMobile(false);
      return;
    }
    setOpen(openDesktop);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-black/[0.07] bg-[#f5f5f7] dark:border-white/10 dark:bg-[#17181b]"
    >
      <SidebarContent className="flex-row gap-0 overflow-hidden">
        <nav
          aria-label={t('primary_navigation')}
          className="flex w-[4.5rem] shrink-0 flex-col items-center border-r border-black/[0.06] px-2 py-3 dark:border-white/[0.08]"
        >
          <Link
            href="/"
            onClick={() => handleNavigation(false)}
            aria-label="WebTools"
            className="mb-5 flex size-10 items-center justify-center rounded-xl transition duration-200 hover:bg-black/[0.045] active:scale-[0.97] dark:hover:bg-white/[0.07]"
          >
            <Image
              src="/logo.png"
              alt="WebTools"
              width={32}
              height={32}
              className="size-8 rounded-lg"
            />
          </Link>

          <div className="flex w-full flex-col gap-1.5">
            {modules.map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => handleNavigation(item.id !== 'home')}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium text-[#6e6e73] transition duration-200 hover:bg-black/[0.045] hover:text-[#1d1d1f] active:scale-[0.98] dark:text-[#98989d] dark:hover:bg-white/[0.07] dark:hover:text-[#f5f5f7]',
                    active &&
                      'bg-black/[0.065] text-[#1d1d1f] dark:bg-white/[0.1] dark:text-[#f5f5f7]'
                  )}
                >
                  <Icon className="size-[1.15rem]" />
                  <span className="max-w-full truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <aside className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 dark:border-white/[0.08]">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">
                {panelTitle}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label={t('collapse_sidebar')}
              title={t('collapse_sidebar')}
              className="size-8 shrink-0 rounded-lg text-[#86868b] hover:bg-black/[0.05] dark:text-[#98989d] dark:hover:bg-white/[0.08]"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {activeModule === 'assistant' ? (
              <Link
                href="/chat"
                onClick={() => handleNavigation(true)}
                className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1d1d1f] px-3 text-sm font-medium text-white transition duration-200 hover:bg-[#343437] active:scale-[0.99] dark:bg-[#f5f5f7] dark:text-[#1d1d1f] dark:hover:bg-white"
              >
                <Plus className="size-4" />
                {t('new_chat')}
              </Link>
            ) : null}

            <WorkspaceNavigationList
              items={panelItems}
              pathname={pathname}
              onNavigate={() => handleNavigation(true)}
            />

            {activeModule === 'assistant' ? <ChatLibrary /> : null}

            {activeModule === 'home' ? (
              <Link
                href="/submit"
                onClick={() => handleNavigation(true)}
                className="mt-5 flex h-9 items-center gap-3 border-t border-black/[0.06] px-3 pt-4 text-[13px] font-medium text-[#6e6e73] transition hover:text-[#1d1d1f] dark:border-white/[0.08] dark:text-[#98989d] dark:hover:text-[#f5f5f7]"
              >
                <Send className="size-4" />
                {t('submit')}
              </Link>
            ) : null}
          </div>
        </aside>
      </SidebarContent>

      <SidebarFooter className="border-t border-black/[0.06] dark:border-white/[0.08]">
        <SidebarUser
          user={{
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
            official_username: officialProfileUsername || undefined,
            show_email: false,
            show_signout: true,
            signout_callback: '/',
            signin_callback: '/',
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

function WorkspaceNavigationList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isPathActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-[#5f6065] transition duration-200 hover:bg-black/[0.045] hover:text-[#1d1d1f] active:scale-[0.99] dark:text-[#a1a1a6] dark:hover:bg-white/[0.07] dark:hover:text-[#f5f5f7]',
              active &&
                'bg-black/[0.065] text-[#1d1d1f] dark:bg-white/[0.1] dark:text-[#f5f5f7]'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
