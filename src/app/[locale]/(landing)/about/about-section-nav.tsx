'use client';

import { useEffect, useState } from 'react';

interface SectionNavItem {
  id: string;
  label: string;
}

interface AboutSectionNavProps {
  items: SectionNavItem[];
  label: string;
}

export function AboutSectionNav({ items, label }: AboutSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

        if (activeEntry) {
          setActiveId(activeEntry.target.id);
        }
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label={label} className="overflow-x-auto border-y border-border/70 py-3 lg:sticky lg:top-24 lg:border-0 lg:py-0">
      <ul className="flex min-w-max gap-1 lg:block lg:min-w-0 lg:space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <li key={item.id}>
              <a
                aria-current={isActive ? 'location' : undefined}
                className={`block border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:border-b-0 lg:border-l-2 lg:px-4 ${
                  isActive
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                href={`#${item.id}`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
