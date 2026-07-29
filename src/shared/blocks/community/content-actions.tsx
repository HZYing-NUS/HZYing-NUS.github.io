'use client';

import { useState } from 'react';
import { ArrowUpRight, Bot, FolderKanban, LogIn } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { useAppContext } from '@/shared/contexts/app';

export function CommunityContentActions({
  targetId,
  targetType,
  canLike,
  canInteract = true,
  initialLiked = false,
  initialBookmarked = false,
  locale,
  callbackUrl,
  projectHref,
  aiHref,
  restrictedActionLabel,
  restrictedActionDescription,
}: {
  targetId: string;
  targetType: 'resource' | 'collection' | 'article' | 'list';
  canLike?: boolean;
  canInteract?: boolean;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  locale: string;
  callbackUrl?: string;
  projectHref?: string;
  aiHref?: string;
  restrictedActionLabel?: string;
  restrictedActionDescription?: string;
}) {
  const zh = locale === 'zh';
  const { setIsShowSignModal, setSignCallbackUrl } = useAppContext();
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [message, setMessage] = useState('');
  const requestSignIn = () => {
    setSignCallbackUrl(callbackUrl || null);
    setIsShowSignModal(true);
  };
  const update = async (type: 'like' | 'bookmark', active: boolean) => {
    const response = await fetch(`/api/community/interactions/${type}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetId, targetType, active }),
    });
    const result = await response.json();
    if (result.code === 0) {
      if (type === 'like') setLiked(active);
      else setBookmarked(active);
    } else setMessage(result.message);
  };
  const actionClass =
    'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-medium transition hover:bg-muted';

  return (
    <div className="bg-muted/20 mt-6 rounded-2xl border p-4">
      {!canInteract && restrictedActionDescription ? (
        <p className="text-muted-foreground mb-3 text-sm leading-6">
          {restrictedActionDescription}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {canLike &&
          (canInteract ? (
            <button
              className={actionClass}
              onClick={() => void update('like', !liked)}
            >
              {liked ? (zh ? '取消赞' : 'Unlike') : zh ? '点赞' : 'Like'}
            </button>
          ) : (
            <button className={actionClass} onClick={requestSignIn}>
              <LogIn className="size-4" aria-hidden="true" />
              {zh ? '登录后点赞' : 'Sign in to like'}
            </button>
          ))}
        {canInteract ? (
          <button
            className={actionClass}
            onClick={() => void update('bookmark', !bookmarked)}
          >
            {bookmarked
              ? zh
                ? '取消收藏'
                : 'Remove bookmark'
              : zh
                ? '收藏'
                : 'Bookmark'}
          </button>
        ) : (
          <button className={actionClass} onClick={requestSignIn}>
            <LogIn className="size-4" aria-hidden="true" />
            {restrictedActionLabel ||
              (zh ? '登录后收藏' : 'Sign in to bookmark')}
          </button>
        )}
        {projectHref ? (
          canInteract ? (
            <Link className={actionClass} href={projectHref}>
              <FolderKanban className="size-4" aria-hidden="true" />
              {zh ? '在项目中使用' : 'Use in a project'}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <button className={actionClass} onClick={requestSignIn}>
              <FolderKanban className="size-4" aria-hidden="true" />
              {zh ? '登录后加入项目' : 'Sign in to use in a project'}
            </button>
          )
        ) : null}
        {aiHref ? (
          canInteract ? (
            <Link className={actionClass} href={aiHref}>
              <Bot className="size-4" aria-hidden="true" />
              {zh ? '向 AI 追问' : 'Ask AI about this'}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <button className={actionClass} onClick={requestSignIn}>
              <Bot className="size-4" aria-hidden="true" />
              {zh ? '登录后向 AI 追问' : 'Sign in to ask AI'}
            </button>
          )
        ) : null}
        {message && (
          <span className="text-muted-foreground text-xs">{message}</span>
        )}
      </div>
    </div>
  );
}
