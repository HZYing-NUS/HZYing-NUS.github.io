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
    <div className="bg-background text-foreground min-h-[calc(100dvh-3.5rem)]">
      <main className="mx-auto w-full max-w-6xl px-5 py-9 lg:px-10 lg:py-12">
        <div className="border-border mb-9 flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-primary mb-3 text-[13px] font-medium tracking-[0.4px]">
              {locale === 'zh' ? 'WebTools 工作台' : 'WebTools workspace'}
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-[2.5rem]">
              {title}
            </h1>
            {description ? (
              <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
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
    <div className="bg-card text-muted-foreground rounded-xl border border-dashed border-[var(--linear-hairline-strong)] px-6 py-16 text-center text-sm">
      {children}
    </div>
  );
}
