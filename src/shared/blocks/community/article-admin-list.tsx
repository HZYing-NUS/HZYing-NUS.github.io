'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';

type Row = {
  article: { id: string; slug: string; status: string; featured: boolean };
  revision: {
    sourceLocale: string;
    titleZh: string | null;
    titleEn: string | null;
    reviewStatus: string;
  };
};

export function CommunityAdminArticleList() {
  const t = useTranslations('community.admin');
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    void fetch('/api/admin/community/articles')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.code !== 0) throw new Error(payload.message);
        setRows(payload.data);
      })
      .catch((error) => toast.error(error.message));
  }, []);
  return (
    <main className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-muted-foreground mt-2">{t('description')}</p>
      <div className="mt-8 space-y-3">
        {rows.map(({ article, revision }) => (
          <Link
            key={article.id}
            href={`/admin/community/articles/${article.id}`}
            className="bg-card flex justify-between rounded-xl border p-5"
          >
            <div>
              <p className="font-medium">
                {revision.sourceLocale === 'zh'
                  ? revision.titleZh
                  : revision.titleEn}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                /{article.slug}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {article.featured ? <Badge>{t('featured')}</Badge> : null}
              <Badge variant="outline">
                {revision.reviewStatus === 'pending_review'
                  ? t('pending')
                  : t(`status.${article.status}`)}
              </Badge>
            </div>
          </Link>
        ))}
        {rows.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center">
            {t('empty')}
          </div>
        ) : null}
      </div>
    </main>
  );
}
