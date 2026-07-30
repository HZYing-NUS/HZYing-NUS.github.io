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
    <section className="mt-5 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
      <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-[#86868b] uppercase dark:text-[#77777c]">
        {t('title')}
      </p>
      <div className="space-y-1">
        {chats.slice(0, limit).map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            title={chat.title}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-lg px-3 text-[13px] text-[#6e6e73] transition duration-200 hover:bg-black/[0.045] hover:text-[#1d1d1f] dark:text-[#98989d] dark:hover:bg-white/[0.07] dark:hover:text-[#f5f5f7]',
              params.id === chat.id &&
                'bg-black/[0.065] text-[#1d1d1f] dark:bg-white/[0.1] dark:text-[#f5f5f7]'
            )}
          >
            <IconMessageCircle className="size-4 shrink-0" />
            <span className="truncate">{chat.title}</span>
          </Link>
        ))}

        {hasMore ? (
          <Link
            href="/chat/history"
            className="flex h-8 items-center gap-2.5 rounded-lg px-3 text-[13px] text-[#6e6e73] transition duration-200 hover:bg-black/[0.045] hover:text-[#1d1d1f] dark:text-[#98989d] dark:hover:bg-white/[0.07] dark:hover:text-[#f5f5f7]"
          >
            <IconDots className="size-4 shrink-0" />
            <span>{t('more')}</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
