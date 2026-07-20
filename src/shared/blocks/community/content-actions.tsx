'use client';

import { useState } from 'react';

export function CommunityContentActions({
  targetId,
  targetType,
  canLike,
  canInteract = true,
  initialLiked = false,
  initialBookmarked = false,
  locale,
}: {
  targetId: string;
  targetType: 'resource' | 'collection' | 'article' | 'list';
  canLike?: boolean;
  canInteract?: boolean;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  locale: string;
}) {
  const zh = locale === 'zh';
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [message, setMessage] = useState('');
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
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
      {canLike &&
        (canInteract ? (
          <button
            className="rounded-lg border px-3 py-2"
            onClick={() => void update('like', !liked)}
          >
            {liked ? (zh ? '取消赞' : 'Unlike') : zh ? '点赞' : 'Like'}
          </button>
        ) : (
          <span className="text-muted-foreground rounded-lg border px-3 py-2">
            {zh ? '登录后可点赞' : 'Sign in to like'}
          </span>
        ))}
      {canInteract && (
        <button
          className="rounded-lg border px-3 py-2"
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
      )}
      {message && (
        <span className="text-muted-foreground text-xs">{message}</span>
      )}
    </div>
  );
}
