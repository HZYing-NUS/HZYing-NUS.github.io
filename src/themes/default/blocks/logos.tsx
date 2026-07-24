'use client';

import type { PointerEvent } from 'react';

import { LazyImage, SmartIcon } from '@/shared/blocks/common';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function Logos({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const 是流体步骤 = section.variant === 'flow-steps';
  const 更新卡片光点 = (事件: PointerEvent<HTMLDivElement>) => {
    const 边界 = 事件.currentTarget.getBoundingClientRect();
    事件.currentTarget.style.setProperty(
      '--spot-x',
      `${事件.clientX - 边界.left}px`
    );
    事件.currentTarget.style.setProperty(
      '--spot-y',
      `${事件.clientY - 边界.top}px`
    );
  };

  return (
    <section
      id={section.id}
      className={cn(
        'relative z-10 py-16 md:py-24',
        section.className,
        className
      )}
    >
      <div className={`mx-auto max-w-5xl px-6`}>
        <ScrollAnimation>
          <p
            className={cn(
              'text-md text-center font-medium',
              是流体步骤 &&
                'text-foreground drop-shadow-[0_1px_8px_color-mix(in_oklab,var(--background)_80%,transparent)]'
            )}
          >
            {section.title}
          </p>
        </ScrollAnimation>
        <ScrollAnimation delay={0.2}>
          <div
            className={cn(
              'mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-8 sm:gap-x-16 sm:gap-y-10',
              是流体步骤 && 'gap-3 sm:gap-4'
            )}
          >
            {section.items?.map((item, idx) => (
              <div
                key={idx}
                onPointerMove={是流体步骤 ? 更新卡片光点 : undefined}
                className={cn(
                  'text-muted-foreground flex flex-col items-center gap-3',
                  是流体步骤 &&
                    'webtools-flow-step-card group w-[9.5rem] px-4 py-5'
                )}
              >
                {item.icon ? (
                  <span
                    className={cn(
                      是流体步骤 &&
                        'webtools-flow-step-card__icon bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl'
                    )}
                  >
                    <SmartIcon name={item.icon as string} size={32} />
                  </span>
                ) : (
                  <LazyImage
                    className="h-8 w-fit dark:invert"
                    src={item.image?.src ?? ''}
                    alt={item.image?.alt ?? ''}
                  />
                )}
                {item.title && (
                  <span
                    className={cn(
                      'text-foreground text-sm font-medium',
                      是流体步骤 && 'relative z-10'
                    )}
                  >
                    {item.title}
                  </span>
                )}
              </div>
            ))}
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
