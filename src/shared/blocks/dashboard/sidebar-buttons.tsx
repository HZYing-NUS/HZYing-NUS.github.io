'use client';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { useSidebar } from '@/shared/components/ui/sidebar';
import { cn } from '@/shared/lib/utils';
import { Button as ButtonType } from '@/shared/types/blocks/common';

export function SidebarButtons({ buttons }: { buttons: ButtonType[] }) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <div className="flex flex-col gap-2 px-3 pb-2">
      {buttons.map((button, idx) => (
        <Button
          key={idx}
          asChild
          variant={button.variant || 'outline'}
          size={button.size || 'default'}
          className={cn(
            'h-9 rounded-xl border-black/[0.08] bg-white/55 text-sm font-medium shadow-none transition-all duration-200 hover:border-[#91a8ca]/60 hover:bg-white active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-white/15 dark:hover:bg-white/[0.07]',
            isCollapsed
              ? 'h-8 w-8 justify-center p-0 [&_svg]:size-4 [&_svg]:shrink-0'
              : undefined
          )}
        >
          <Link
            href={button.url || ''}
            target={button.target || '_self'}
            aria-label={button.title || undefined}
            title={button.title || undefined}
          >
            {button.icon && (
              <SmartIcon
                name={button.icon as string}
                className="size-4 shrink-0"
              />
            )}
            {button.title && !isCollapsed && (
              <span className="whitespace-nowrap">{button.title}</span>
            )}
          </Link>
        </Button>
      ))}
    </div>
  );
}
