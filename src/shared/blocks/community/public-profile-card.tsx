import { ArrowRight, FileText } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import type { PublicCommunityProfileRow } from '@/shared/models/community';

export function PublicProfileCard({
  profile,
  locale,
  viewProfileLabel,
  articleCountLabel,
}: {
  profile: PublicCommunityProfileRow;
  locale: string;
  viewProfileLabel: string;
  articleCountLabel: (count: number) => string;
}) {
  const skills = Array.isArray(profile.skills)
    ? profile.skills.map(String).filter(Boolean).slice(0, 5)
    : [];
  const focusAreas = Array.isArray(profile.focusAreas)
    ? profile.focusAreas.map(String).filter(Boolean).slice(0, 3)
    : [];
  const about = locale === 'en' ? profile.aboutEn : profile.aboutZh;
  const description = profile.headline || about;

  return (
    <article className="bg-card flex h-full flex-col rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <ProfileAvatar src={profile.avatarUrl} name={profile.displayName} />
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{profile.displayName}</h2>
          <p className="text-muted-foreground truncate text-sm">
            @{profile.username}
          </p>
        </div>
      </div>

      {description ? (
        <p className="text-muted-foreground mt-4 line-clamp-3 text-sm leading-6">
          {description}
        </p>
      ) : null}

      {skills.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="bg-muted text-muted-foreground rounded-md px-2.5 py-1 text-xs"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      {focusAreas.length ? (
        <p className="text-muted-foreground mt-4 text-xs leading-5">
          {locale === 'zh' ? '关注：' : 'Focus: '}
          {focusAreas.join(' · ')}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <FileText className="size-3.5" />
          {articleCountLabel(profile.articleCount)}
        </span>
        <Link
          href={`/u/${profile.username}`}
          aria-label={`${viewProfileLabel} ${profile.displayName}`}
          className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          {viewProfileLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function ProfileAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="size-12 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-lg text-base font-semibold">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
