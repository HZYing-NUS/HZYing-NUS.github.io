'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { IconDots, IconMessageCircle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { useAppContext } from '@/shared/contexts/app';
import { useChatContext } from '@/shared/contexts/chat';
import { cn } from '@/shared/lib/utils';

export function ChatLibrary({}) {
  const t = useTranslations('ai.chat.library');
  const params = useParams();

  const { user } = useAppContext();

  const { chats, setChats } = useChatContext();
  const [hasMore, setHasMore] = useState(false);

  const page = 1;
  const limit = 6;

  const fetchChats = useCallback(async () => {
    try {
      const resp = await fetch('/api/chat/list', {
        method: 'POST',
        body: JSON.stringify({ page, limit }),
      });
      if (!resp.ok) {
        throw new Error(`fetch chats failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      const { list, hasMore } = data;

      setChats(list);
      setHasMore(hasMore);
    } catch (e: any) {
      console.log('fetch chats failed:', e);
      return [];
    }
  }, [limit, page, setChats]);

  useEffect(() => {
    if (user) {
      void fetchChats();
    }
  }, [fetchChats, user]);

  return (
    <section className="border-sidebar-border mt-5 border-t pt-4">
      <p className="text-muted-foreground mb-2 px-3 text-[11px] font-medium tracking-[0.4px]">
        {t('title')}
      </p>
      <div className="space-y-1">
        {chats.slice(0, limit).map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            title={chat.title}
            className={cn(
              'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-8 items-center gap-2.5 rounded-lg px-3 text-[13px] transition duration-200',
              params.id === chat.id &&
                'bg-sidebar-accent text-sidebar-foreground'
            )}
          >
            <IconMessageCircle className="size-4 shrink-0" />
            <span className="truncate">{chat.title}</span>
          </Link>
        ))}

        {hasMore ? (
          <Link
            href="/chat/history"
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-8 items-center gap-2.5 rounded-lg px-3 text-[13px] transition duration-200"
          >
            <IconDots className="size-4 shrink-0" />
            <span>{t('more')}</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
