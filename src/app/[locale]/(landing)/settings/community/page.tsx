import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Empty } from '@/shared/blocks/common';
import { ensureCommunityProfile } from '@/shared/models/community';
import { getUserInfo } from '@/shared/models/user';

export default async function CommunityCenterPage() {
  const [user, t] = await Promise.all([
    getUserInfo(),
    getTranslations('community.center'),
  ]);
  if (!user) return <Empty message="no auth" />;
  await ensureCommunityProfile({
    userId: user.id,
    name: user.name,
    image: user.image,
  });

  const modules = t.raw('modules') as Array<{
    title: string;
    description: string;
    href: string;
  }>;
  return (
    <div>
      <h1 className="text-3xl font-semibold">{t('title')}</h1>
      <p className="text-muted-foreground mt-2">{t('description')}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="rounded-2xl border p-5"
          >
            <h2 className="font-semibold">{module.title}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {module.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
