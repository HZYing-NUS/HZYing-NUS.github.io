'use client';

import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';

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
  const locale = useLocale();

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#f7f7f8] text-[#1d1d1f] dark:bg-[#101114] dark:text-[#f5f5f7]">
      <main className="mx-auto w-full max-w-6xl px-5 py-9 lg:px-10 lg:py-12">
        <div className="mb-9 flex flex-col justify-between gap-5 border-b border-black/[0.07] pb-7 sm:flex-row sm:items-end dark:border-white/10">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.1em] text-[#5474a8] uppercase dark:text-[#8faee0]">
              {locale === 'zh' ? 'WebTools 工作台' : 'WebTools workspace'}
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-[2.5rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73] dark:text-[#a1a1a6]">
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
    <div className="rounded-2xl border border-dashed border-black/15 bg-white/55 px-6 py-16 text-center text-sm text-[#6e6e73] dark:border-white/15 dark:bg-white/[0.03] dark:text-[#a1a1a6]">
      {children}
    </div>
  );
}
