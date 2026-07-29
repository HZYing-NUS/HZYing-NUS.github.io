'use client';

import type { ReactNode } from 'react';

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
    <div className="dark:bg-background dark:text-foreground min-h-[calc(100dvh-3.5rem)] bg-[#f5f1e8] text-[#24231f]">
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
