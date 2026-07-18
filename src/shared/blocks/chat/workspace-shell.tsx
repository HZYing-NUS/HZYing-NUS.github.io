'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { LocaleSelector } from '@/shared/blocks/common';
import { SidebarTrigger } from '@/shared/components/ui/sidebar';

export function WorkspaceShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dark:bg-background dark:text-foreground min-h-screen bg-[#f5f1e8] text-[#24231f]">
      <header className="dark:border-border dark:bg-background/95 sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-black/10 bg-[#f5f1e8]/95 px-5 backdrop-blur">
        <SidebarTrigger className="size-8" />
        <div className="dark:bg-border h-4 w-px bg-black/15" />
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase">
          WebTools / Workspace
        </p>
        <div className="ml-auto">
          <LocaleSelector />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 lg:px-10">
        <div className="dark:border-border mb-10 flex flex-col justify-between gap-5 border-b border-black/15 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 font-mono text-[10px] tracking-[0.22em] text-[#777268] uppercase">
              AI workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="dark:text-muted-foreground mt-3 max-w-2xl text-sm leading-6 text-[#67635b]">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

export function WorkspaceEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="dark:border-border dark:text-muted-foreground border-y border-black/10 py-16 text-center text-sm text-[#777268]">
      {children}
    </div>
  );
}
