'use client';

import { SmartIcon } from '@/shared/blocks/common';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function FeaturesStep({
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
      <div className="mx-4">
        <div className="@container relative container">
          <ScrollAnimation>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-primary text-[13px] font-medium tracking-[0.4px]">
                {section.label}
              </span>
              <h2 className="text-foreground mt-4 text-[2.5rem] leading-[1.15] font-semibold tracking-[-0.025em] md:text-[3.5rem]">
                {section.title}
              </h2>
              <p className="text-muted-foreground mt-4 text-lg text-balance">
                {section.description}
              </p>
            </div>
          </ScrollAnimation>

          <ScrollAnimation delay={0.2}>
            <div className="border-border bg-border mt-16 grid gap-px overflow-hidden rounded-xl border @3xl:grid-cols-2">
              {section.items?.map((item, idx) => (
                <div className="bg-card p-6 md:p-8" key={idx}>
                  <div>
                    <span className="text-primary font-mono text-xs tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="mt-8">
                      <div className="bg-secondary text-primary flex size-10 items-center justify-center rounded-lg">
                        {item.icon && (
                          <SmartIcon name={item.icon as string} size={20} />
                        )}
                      </div>
                    </div>
                    <h3 className="text-foreground mt-6 mb-3 text-lg font-medium tracking-[-0.01em]">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground max-w-lg text-sm leading-6 text-balance">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
