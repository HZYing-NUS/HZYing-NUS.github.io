'use client';

import { useState } from 'react';

export function CommunityProfileFollowButton({
  userId,
  initialFollowing,
  locale,
}: {
  userId: string;
  initialFollowing: boolean;
  locale: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState('');
  const toggle = async () => {
    const response = await fetch('/api/community/interactions/follow', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, active: !following }),
    });
    const result = await response.json();
    if (result.code === 0) setFollowing(!following);
    else setError(result.message);
  };
  return (
    <div className="mt-6">
      <button
        onClick={toggle}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm"
      >
        {following
          ? locale === 'zh'
            ? '取消关注'
            : 'Unfollow'
          : locale === 'zh'
            ? '关注'
            : 'Follow'}
      </button>
      {error && <p className="mt-2 text-xs">{error}</p>}
    </div>
  );
}
