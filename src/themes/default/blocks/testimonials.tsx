'use client';

import { LazyImage, SmartIcon } from '@/shared/blocks/common';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Section, SectionItem } from '@/shared/types/blocks/landing';

export function Testimonials({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const TestimonialCard = ({ item }: { item: SectionItem }) => {
    return (
      <div className="bg-card border-border flex flex-col justify-end gap-6 rounded-xl border p-8">
        <p className='text-foreground self-end text-balance before:mr-1 before:content-["\201C"] after:ml-1 after:content-["\201D"]'>
          {item.quote || item.description}
        </p>
        <div className="flex items-center gap-3">
          <div className="bg-secondary text-foreground border-border flex aspect-square size-9 items-center justify-center overflow-hidden rounded-lg border">
            {item.icon ? (
              <SmartIcon name={item.icon as string} size={20} />
            ) : (
              <LazyImage
                src={item.image?.src || item.avatar?.src || ''}
                alt={item.image?.alt || item.avatar?.alt || item.name || ''}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <h3 className="sr-only">
            {item.name}, {item.role || item.title}
          </h3>
          <div className="space-y-px">
            <p className="text-sm font-medium">{item.name} </p>
            <p className="text-muted-foreground text-xs">
              {item.role || item.title}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      id={section.id}
      className={`py-16 md:py-24 ${section.className} ${className}`}
    >
      <div className="container">
        <ScrollAnimation>
          <div className="mx-auto max-w-2xl text-center text-balance">
            <h2 className="text-foreground mb-4 text-3xl font-semibold tracking-[-0.025em] md:text-[3.5rem] md:leading-[1.1]">
              {section.title}
            </h2>
            <p className="text-muted-foreground mb-6 md:mb-12 lg:mb-16">
              {section.description}
            </p>
          </div>
        </ScrollAnimation>
        <ScrollAnimation delay={0.2}>
          <div className="border-border/50 relative rounded-(--radius)">
            <div className="grid gap-4 md:grid-cols-2">
              {section.items?.map((item, index) => (
                <TestimonialCard key={index} item={item} />
              ))}
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
