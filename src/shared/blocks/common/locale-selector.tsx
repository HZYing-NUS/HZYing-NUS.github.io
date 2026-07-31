'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Globe, Languages, Monitor } from 'lucide-react';
import { useLocale } from 'next-intl';

import { usePathname, useRouter } from '@/core/i18n/navigation';
import { localeNames } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cacheGet, cacheRemove, cacheSet } from '@/shared/lib/cache';

const SYSTEM_LOCALE = 'system';
const LOCALE_MODE_KEY = 'locale-mode';

function detectSystemLocale() {
  const browserLocale = navigator.language.split('-')[0].toLowerCase();
  return Object.prototype.hasOwnProperty.call(localeNames, browserLocale)
    ? browserLocale
    : 'en';
}

export function LocaleSelector({
  type = 'icon',
}: {
  type?: 'icon' | 'button';
}) {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString?.() ?? '';
  const [mounted, setMounted] = useState(false);
  const [localeMode, setLocaleMode] = useState('manual');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedMode = cacheGet(LOCALE_MODE_KEY) || 'manual';
      setLocaleMode(savedMode);
      setMounted(true);
      if (savedMode === SYSTEM_LOCALE) {
        const systemLocale = detectSystemLocale();
        if (systemLocale !== currentLocale) {
          router.replace(query ? `${pathname}?${query}` : pathname, {
            locale: systemLocale,
          });
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentLocale, pathname, query, router]);

  const handleSwitchLanguage = (value: string) => {
    const nextLocale = value === SYSTEM_LOCALE ? detectSystemLocale() : value;
    if (value === SYSTEM_LOCALE) {
      cacheRemove('locale');
      cacheSet(LOCALE_MODE_KEY, SYSTEM_LOCALE);
      setLocaleMode(SYSTEM_LOCALE);
    } else {
      // Update localStorage to sync with locale detector
      cacheSet('locale', value);
      cacheSet(LOCALE_MODE_KEY, 'manual');
      setLocaleMode('manual');
    }
    if (nextLocale !== currentLocale) {
      const href = query ? `${pathname}?${query}` : pathname;
      router.push(href, {
        locale: nextLocale,
      });
    }
  };

  // Return a placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant={type === 'icon' ? 'ghost' : 'outline'}
        size={type === 'icon' ? 'icon' : 'sm'}
        className={
          type === 'icon' ? 'h-auto w-auto p-0' : 'hover:bg-primary/10'
        }
        disabled
      >
        {type === 'icon' ? (
          <Languages size={18} />
        ) : (
          <>
            <Globe size={16} />
            {localeNames[currentLocale]}
          </>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {type === 'icon' ? (
          <Button variant="ghost" size="icon" className="h-auto w-auto p-0">
            <Languages size={18} />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="hover:bg-primary/10">
            <Globe size={16} />
            {localeNames[currentLocale]}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleSwitchLanguage(SYSTEM_LOCALE)}>
          <span className="flex items-center gap-2">
            <Monitor size={16} />
            {currentLocale === 'zh' ? '跟随系统' : 'System'}
          </span>
          {localeMode === SYSTEM_LOCALE ? (
            <Check size={16} className="text-primary" />
          ) : null}
        </DropdownMenuItem>
        {Object.keys(localeNames).map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSwitchLanguage(locale)}
          >
            <span>{localeNames[locale]}</span>
            {localeMode !== SYSTEM_LOCALE && locale === currentLocale && (
              <Check size={16} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
