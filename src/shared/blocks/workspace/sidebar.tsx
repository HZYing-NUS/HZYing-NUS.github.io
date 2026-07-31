'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Blocks,
  Boxes,
  Brain,
  ChartNoAxesColumnIncreasing,
  CircleDotDashed,
  Code2,
  Coins,
  Compass,
  FolderKanban,
  History,
  LayoutTemplate,
  Lightbulb,
  ListChecks,
  Megaphone,
  MessageSquareText,
  Newspaper,
  PanelLeftClose,
  PenLine,
  Plus,
  Rocket,
  Search,
  Send,
  Sparkles,
  UsersRound,
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

type WorkspaceModule =
  | 'home'
  | 'assistant'
  | 'resources'
  | 'collections'
  | 'articles';

type NavigationItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

function resolveModule(pathname: string): WorkspaceModule {
  if (pathname.startsWith('/chat') || pathname.startsWith('/settings')) {
    return 'assistant';
  }
  if (pathname.startsWith('/collections')) return 'collections';
  if (pathname.startsWith('/blog') || pathname.startsWith('/submit')) {
    return 'articles';
  }
  if (pathname.startsWith('/resources') || pathname.startsWith('/search')) {
    return 'resources';
  }
  return 'home';
}

function isPathActive(
  pathname: string,
  searchParams: URLSearchParams,
  item: NavigationItem
) {
  const [hrefPath, query = ''] = item.href.split('?');
  const expectedParams = new URLSearchParams(query);

  if (expectedParams.size > 0) {
    return (
      pathname === hrefPath &&
      Array.from(expectedParams.entries()).every(
        ([key, value]) => searchParams.get(key) === value
      )
    );
  }
  if (item.exact) {
    return pathname === hrefPath && searchParams.size === 0;
  }
  if (item.href === '/') return pathname === '/';
  if (item.href === '/chat') {
    return (
      pathname === '/chat' ||
      /^\/chat\/(?!projects(?:\/|$)|history(?:\/|$)|skills(?:\/|$)|credits(?:\/|$)|memories(?:\/|$))/.test(
        pathname
      )
    );
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

export function WorkspaceSidebar({
  officialProfileUsername,
}: {
  officialProfileUsername?: string | null;
}) {
  const t = useTranslations('ai.chat.workspace_shell');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const routeModule = resolveModule(pathname);
  const [selectedModule, setSelectedModule] =
    useState<WorkspaceModule>(routeModule);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedModule(routeModule);
      if (!isMobile) setOpen(routeModule !== 'home');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, routeModule, setOpen]);

  const modules: Array<{
    id: Exclude<WorkspaceModule, 'home'>;
    title: string;
    href: string;
    icon: NavigationItem['icon'];
  }> = [
    {
      id: 'assistant',
      title: t('assistant_short'),
      href: '/chat',
      icon: MessageSquareText,
    },
    {
      id: 'resources',
      title: t('resources'),
      href: '/resources',
      icon: Boxes,
    },
    {
      id: 'collections',
      title: t('collections'),
      href: '/collections',
      icon: ListChecks,
    },
    {
      id: 'articles',
      title: t('articles'),
      href: '/blog',
      icon: Newspaper,
    },
  ];

  const assistantItems: NavigationItem[] = [
    { title: t('projects'), href: '/chat/projects', icon: FolderKanban },
    { title: t('chat_history'), href: '/chat/history', icon: History },
    { title: t('skills'), href: '/chat/skills', icon: Blocks },
    { title: t('memory'), href: '/chat/memories', icon: Brain },
    { title: t('credit'), href: '/chat/credits', icon: Coins },
  ];
  const resourceItems: NavigationItem[] = [
    { title: t('site_search'), href: '/search', icon: Search },
    {
      title: t('all_resources'),
      href: '/resources',
      icon: Compass,
      exact: true,
    },
    {
      title: t('stage_discover'),
      href: '/resources?stage=platform%3Astage%3Adiscover-demand',
      icon: CircleDotDashed,
    },
    {
      title: t('stage_validate'),
      href: '/resources?stage=platform%3Astage%3Avalidate-the-idea',
      icon: Lightbulb,
    },
    {
      title: t('stage_design'),
      href: '/resources?stage=platform%3Astage%3Adesign-and-prototype',
      icon: LayoutTemplate,
    },
    {
      title: t('stage_develop'),
      href: '/resources?stage=platform%3Astage%3Abuild-the-product',
      icon: Code2,
    },
    {
      title: t('stage_launch'),
      href: '/resources?stage=platform%3Astage%3Alaunch',
      icon: Rocket,
    },
    {
      title: t('stage_optimize'),
      href: '/resources?stage=platform%3Astage%3Ameasure-and-optimize',
      icon: ChartNoAxesColumnIncreasing,
    },
    {
      title: t('stage_operate'),
      href: '/resources?stage=platform%3Astage%3Aoperate-and-grow',
      icon: Megaphone,
    },
  ];
  const collectionItems: NavigationItem[] = [
    {
      title: t('all_collections'),
      href: '/collections',
      icon: ListChecks,
      exact: true,
    },
    {
      title: t('collection_discover'),
      href: '/collections/find-a-product-problem',
      icon: Search,
      exact: true,
    },
    {
      title: t('collection_validate'),
      href: '/collections/validate-product-idea',
      icon: Lightbulb,
      exact: true,
    },
    {
      title: t('collection_prototype'),
      href: '/collections/build-testable-prototype',
      icon: LayoutTemplate,
      exact: true,
    },
  ];
  const articleItems: NavigationItem[] = [
    {
      title: t('all_articles'),
      href: '/blog',
      icon: Newspaper,
      exact: true,
    },
    {
      title: t('featured_articles'),
      href: '/blog?filter=featured',
      icon: Sparkles,
    },
    {
      title: t('following_articles'),
      href: '/blog?filter=following',
      icon: UsersRound,
    },
    {
      title: t('author_directory'),
      href: '/blog?view=authors',
      icon: PenLine,
    },
  ];

  const panelItems =
    selectedModule === 'home'
      ? []
      : selectedModule === 'assistant'
        ? assistantItems
        : selectedModule === 'resources'
          ? resourceItems
          : selectedModule === 'collections'
            ? collectionItems
            : articleItems;
  const panelTitle =
    selectedModule === 'home'
      ? t('home')
      : selectedModule === 'assistant'
        ? t('assistant')
        : selectedModule === 'resources'
          ? t('resources')
          : selectedModule === 'collections'
            ? t('collections')
            : t('articles');

  const handleHomeNavigation = () => {
    setSelectedModule('home');
    if (isMobile) {
      setOpenMobile(false);
      return;
    }
    setOpen(false);
  };

  const handleModuleNavigation = (module: Exclude<WorkspaceModule, 'home'>) => {
    setSelectedModule(module);
    if (!isMobile) setOpen(true);
  };

  const handleSecondaryNavigation = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border bg-sidebar border-r"
    >
      <SidebarContent className="flex-row gap-0 overflow-hidden">
        <nav
          aria-label={t('primary_navigation')}
          className="border-sidebar-border relative flex w-[4.5rem] shrink-0 flex-col items-center border-r px-2 py-3"
        >
          <Link
            href="/"
            onClick={handleHomeNavigation}
            aria-current={routeModule === 'home' ? 'page' : undefined}
            aria-label={`${t('home')} · WebTools`}
            className={cn(
              'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground mb-3 flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition duration-200 active:translate-y-px',
              routeModule === 'home' &&
                'bg-sidebar-accent text-sidebar-foreground'
            )}
          >
            <Image
              src="/logo.png"
              alt="WebTools"
              width={32}
              height={32}
              className="size-8 rounded-lg"
            />
            <span>{t('home')}</span>
          </Link>

          <div className="flex w-full flex-col gap-1">
            {modules.map((item) => {
              const Icon = item.icon;
              const active = routeModule === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => handleModuleNavigation(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition duration-200 active:translate-y-px',
                    active && 'bg-sidebar-accent text-sidebar-foreground'
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
          <div className="border-sidebar-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
            <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">
              {panelTitle}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => (isMobile ? setOpenMobile(false) : setOpen(false))}
              aria-label={t('collapse_sidebar')}
              title={t('collapse_sidebar')}
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground size-8 shrink-0 rounded-lg"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {selectedModule === 'assistant' ? (
              <Link
                href="/chat"
                onClick={handleSecondaryNavigation}
                className="bg-primary text-primary-foreground mb-3 flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition duration-200 hover:bg-[var(--linear-primary-hover)] active:translate-y-px"
              >
                <Plus className="size-4" />
                {t('new_chat')}
              </Link>
            ) : null}

            <WorkspaceNavigationList
              items={panelItems}
              pathname={pathname}
              searchParams={searchParams}
              onNavigate={handleSecondaryNavigation}
            />

            {selectedModule === 'assistant' ? <ChatLibrary /> : null}

            {selectedModule !== 'assistant' ? (
              <Link
                href="/submit"
                onClick={handleSecondaryNavigation}
                className="text-muted-foreground border-sidebar-border hover:text-sidebar-foreground mt-5 flex h-10 items-center gap-3 border-t px-3 pt-4 text-[13px] font-medium transition"
              >
                <Send className="size-4" />
                {t('submit')}
              </Link>
            ) : null}
          </div>
        </aside>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t">
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
            show_admin: true,
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
  searchParams,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isPathActive(pathname, searchParams, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-[13px] leading-5 font-medium transition duration-200 active:translate-y-px',
              active && 'bg-sidebar-accent text-sidebar-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
