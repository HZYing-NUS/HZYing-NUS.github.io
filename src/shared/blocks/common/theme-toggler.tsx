'use client';

import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, SunDim } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';

import { AnimatedThemeToggler } from '@/shared/components/magicui/animated-theme-toggler';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/shared/components/ui/toggle-group';

export function ThemeToggler({
  type = 'icon',
  className,
}: {
  type?: 'icon' | 'button' | 'toggle' | 'menu';
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const handleThemeChange = (value: string) => {
    setTheme(value);
  };

  if (!mounted) {
    return null;
  }

  if (type === 'button') {
    return (
      <Button variant="outline" size="sm" className="hover:bg-primary/10">
        <SunDim />
      </Button>
    );
  } else if (type === 'toggle') {
    return (
      <ToggleGroup
        type="single"
        className={` ${className}`}
        value={theme}
        onValueChange={handleThemeChange}
        variant="outline"
      >
        <ToggleGroupItem
          value="light"
          onClick={() => setTheme('light')}
          aria-label="Switch to light mode"
        >
          <SunDim />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dark"
          onClick={() => setTheme('dark')}
          aria-label="Switch to dark mode"
        >
          <Moon />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="system"
          onClick={() => setTheme('system')}
          aria-label="Switch to system mode"
        >
          <Monitor />
        </ToggleGroupItem>
      </ToggleGroup>
    );
  } else if (type === 'menu') {
    const themeOptions = [
      {
        value: 'light',
        label: locale === 'zh' ? '浅色' : 'Light',
        icon: SunDim,
      },
      {
        value: 'dark',
        label: locale === 'zh' ? '深色' : 'Dark',
        icon: Moon,
      },
      {
        value: 'system',
        label: locale === 'zh' ? '跟随系统' : 'System',
        icon: Monitor,
      },
    ];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            aria-label={locale === 'zh' ? '切换显示模式' : 'Change theme'}
            title={locale === 'zh' ? '切换显示模式' : 'Change theme'}
          >
            {theme === 'dark' ? (
              <Moon className="size-4" />
            ) : theme === 'light' ? (
              <SunDim className="size-4" />
            ) : (
              <Monitor className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="gap-2"
              >
                <Icon className="size-4" />
                <span>{option.label}</span>
                {theme === option.value ? (
                  <Check className="text-primary ml-auto size-4" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return <AnimatedThemeToggler className={className} />;
}
