'use client';

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
  return (
    <section
      id={section.id}
      className={cn('py-16 md:py-24', section.className, className)}
    >
      <div className={`mx-auto max-w-5xl px-6`}>
        <ScrollAnimation>
          <p className="text-md text-center font-medium">{section.title}</p>
        </ScrollAnimation>
        <ScrollAnimation delay={0.2}>
          <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-8 sm:gap-x-16 sm:gap-y-10">
            {section.items?.map((item, idx) => (
              <div
                key={idx}
                className="text-muted-foreground flex flex-col items-center gap-3"
              >
                {item.icon ? (
                  <SmartIcon name={item.icon as string} size={32} />
                ) : (
                  <LazyImage
                    className="h-8 w-fit dark:invert"
                    src={item.image?.src ?? ''}
                    alt={item.image?.alt ?? ''}
                  />
                )}
                {item.title && (
                  <span className="text-foreground text-sm font-medium">
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
