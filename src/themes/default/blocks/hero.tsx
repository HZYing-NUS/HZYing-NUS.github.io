import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { Highlighter } from '@/shared/components/ui/highlighter';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

import { FlowFieldBackground } from './flow-field-background';
import { SocialAvatars } from './social-avatars';

export function Hero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const highlightText = section.highlight_text ?? '';
  const isWebToolsHero = section.variant === 'webtools-public';
  let texts = null;
  if (highlightText) {
    texts = section.title?.split(highlightText, 2);
  }

  return (
    <section
      id={section.id}
      className={cn(
        'relative isolate pt-24 pb-12 md:pt-36 md:pb-20',
        isWebToolsHero && 'overflow-hidden pt-28 pb-20 md:pt-40 md:pb-28',
        section.className,
        className
      )}
    >
      {section.background_effect === 'flow-field' && <FlowFieldBackground />}

      {section.announcement && !isWebToolsHero && (
        <Link
          href={section.announcement.url || ''}
          target={section.announcement.target || '_self'}
          className="hover:bg-background dark:hover:border-t-border bg-muted group relative z-10 mx-auto mb-8 flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
        >
          <span className="text-foreground text-sm">
            {section.announcement.title}
          </span>
          <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

          <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
            <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
              <span className="flex size-6">
                <ArrowRight className="m-auto size-3" />
              </span>
              <span className="flex size-6">
                <ArrowRight className="m-auto size-3" />
              </span>
            </div>
          </div>
        </Link>
      )}

      <div
        className={cn(
          'relative z-10 mx-auto max-w-full px-4 text-center md:max-w-5xl',
          isWebToolsHero &&
            'grid max-w-7xl items-end gap-12 px-5 text-left md:px-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-24'
        )}
      >
        <div>
          {section.announcement && isWebToolsHero && (
            <Link
              href={section.announcement.url || ''}
              target={section.announcement.target || '_self'}
              className="bg-card/85 group border-border hover:bg-secondary mb-8 inline-flex min-h-9 items-center gap-3 rounded-full border px-3.5 py-2 text-sm font-medium backdrop-blur transition duration-200 hover:border-[var(--linear-hairline-strong)]"
            >
              <span className="bg-foreground size-1.5 rounded-full" />
              {section.announcement.title}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}

          {texts && texts.length > 0 ? (
            <h1
              className={cn(
                'text-foreground text-4xl font-semibold text-balance sm:mt-12 sm:text-6xl',
                isWebToolsHero &&
                  'max-w-4xl text-[clamp(2.75rem,7vw,5rem)] leading-[1.05] tracking-[-0.05em] sm:mt-0'
              )}
            >
              {isWebToolsHero ? (
                <>
                  {texts[0]}
                  <span className="text-foreground block font-semibold">
                    {highlightText}
                    {texts[1]}
                  </span>
                </>
              ) : (
                <>
                  {texts[0]}
                  <Highlighter action="underline" color="#FF9800">
                    {highlightText}
                  </Highlighter>
                  {texts[1]}
                </>
              )}
            </h1>
          ) : (
            <h1 className="text-foreground text-4xl font-semibold text-balance sm:mt-12 sm:text-6xl">
              {section.title}
            </h1>
          )}

          <p
            className={cn(
              'text-muted-foreground mt-8 mb-8 text-lg text-balance',
              isWebToolsHero &&
                'max-w-[42rem] text-base leading-7 tracking-[-0.006em] md:text-lg md:leading-8'
            )}
            dangerouslySetInnerHTML={{ __html: section.description ?? '' }}
          />

          {section.buttons && (
            <div
              className={cn(
                'flex items-center justify-center gap-4',
                isWebToolsHero && 'flex-wrap justify-start gap-3'
              )}
            >
              {section.buttons.map((button, idx) => (
                <Button
                  asChild
                  size={button.size || 'default'}
                  variant={button.variant || 'default'}
                  className={cn(
                    'px-4 text-sm',
                    isWebToolsHero &&
                      'h-10 rounded-lg px-3.5 shadow-none transition duration-200 active:translate-y-px',
                    isWebToolsHero && button.variant !== 'outline'
                      ? 'bg-primary text-primary-foreground hover:bg-[var(--linear-primary-hover)]'
                      : '',
                    isWebToolsHero && button.variant === 'outline'
                      ? 'border-border bg-card hover:bg-secondary hover:border-[var(--linear-hairline-strong)]'
                      : ''
                  )}
                  key={idx}
                >
                  <Link
                    href={button.url ?? ''}
                    target={button.target ?? '_self'}
                  >
                    {button.icon && <SmartIcon name={button.icon as string} />}
                    <span>{button.title}</span>
                  </Link>
                </Button>
              ))}
            </div>
          )}

          {section.tip && (
            <p
              className={cn(
                'text-muted-foreground mt-6 block text-center text-sm',
                isWebToolsHero && 'max-w-2xl text-left leading-6'
              )}
              dangerouslySetInnerHTML={{ __html: section.tip ?? '' }}
            />
          )}

          {section.show_avatars && (
            <SocialAvatars tip={section.avatars_tip || ''} />
          )}
        </div>

        {isWebToolsHero && section.items?.length ? (
          <aside className="bg-card text-card-foreground border-border relative overflow-hidden rounded-xl border p-6">
            <p className="text-muted-foreground text-[13px] font-medium tracking-[0.4px]">
              {section.aside_label}
            </p>
            <ol className="relative mt-6 space-y-1">
              {section.items.map((item, index) => (
                <li
                  key={item.title || index}
                  className="group border-border flex gap-4 border-t py-4 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <span className="text-primary pt-0.5 font-mono text-xs tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        ) : null}
      </div>

      {(section.image?.src || section.image_invert?.src) && (
        <div className="border-foreground/10 relative mt-8 border-y sm:mt-16">
          <div className="relative z-10 mx-auto max-w-6xl border-x px-3">
            <div className="border-x">
              <div
                aria-hidden
                className="h-3 w-full bg-[repeating-linear-gradient(-45deg,var(--color-foreground),var(--color-foreground)_1px,transparent_1px,transparent_4px)] opacity-5"
              />
              {section.image_invert?.src && (
                <Image
                  className="border-border/25 relative z-2 hidden w-full border dark:block"
                  src={section.image_invert.src}
                  alt={section.image_invert.alt || section.image?.alt || ''}
                  width={
                    section.image_invert.width || section.image?.width || 1200
                  }
                  height={
                    section.image_invert.height || section.image?.height || 630
                  }
                  sizes="(max-width: 768px) 100vw, 1200px"
                  loading="lazy"
                  fetchPriority="high"
                  quality={75}
                  unoptimized={section.image_invert.src.startsWith('http')}
                />
              )}
              {section.image?.src && (
                <Image
                  className="border-border/25 relative z-2 block w-full border dark:hidden"
                  src={section.image.src}
                  alt={section.image.alt || section.image_invert?.alt || ''}
                  width={
                    section.image.width || section.image_invert?.width || 1200
                  }
                  height={
                    section.image.height || section.image_invert?.height || 630
                  }
                  sizes="(max-width: 768px) 100vw, 1200px"
                  loading="lazy"
                  fetchPriority="high"
                  quality={75}
                  unoptimized={section.image.src.startsWith('http')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {section.background_effect !== 'flow-field' &&
        section.background_image?.src && (
          <div className="absolute inset-0 -z-10 hidden h-full w-full overflow-hidden md:block">
            <div className="from-background/80 via-background/80 to-background absolute inset-0 z-10 bg-gradient-to-b" />
            <Image
              src={section.background_image.src}
              alt={section.background_image.alt || ''}
              className="object-cover opacity-60 blur-[0px]"
              fill
              loading="lazy"
              sizes="(max-width: 768px) 0vw, 100vw"
              quality={70}
              unoptimized={section.background_image.src.startsWith('http')}
            />
          </div>
        )}
    </section>
  );
}
