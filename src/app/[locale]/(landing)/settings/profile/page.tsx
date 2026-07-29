import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Empty } from '@/shared/blocks/common';
import { CommunityProfileEditor } from '@/shared/blocks/community/profile-editor';
import { CommunityUsernameForm } from '@/shared/blocks/community/username-form';
import { FormCard } from '@/shared/blocks/form';
import { ensureCommunityProfile } from '@/shared/models/community';
import { getUserInfo, UpdateUser, updateUser } from '@/shared/models/user';
import { Form as FormType } from '@/shared/types/blocks/form';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.profile');
  const communityProfile = await ensureCommunityProfile({
    userId: user.id,
    name: user.name,
    image: user.image,
  });

  const form: FormType = {
    fields: [
      {
        name: 'email',
        title: t('fields.email'),
        type: 'email',
        attributes: { disabled: true },
      },
      { name: 'name', title: t('fields.name'), type: 'text' },
      {
        name: 'image',
        title: t('fields.avatar'),
        type: 'upload_image',
        metadata: {
          max: 1,
        },
      },
    ],
    data: user,
    passby: {
      user: user,
    },
    submit: {
      handler: async (data: FormData, passby: any) => {
        'use server';

        const { user } = passby;
        if (!user) {
          throw new Error('no auth');
        }

        const name = data.get('name') as string;
        if (!name?.trim()) {
          throw new Error('name is required');
        }

        const image = data.get('image');
        console.log('image', image, typeof image);

        const updatedUser: UpdateUser = {
          name: name.trim(),
          image: image as string,
        };

        await updateUser(user.id, updatedUser);

        return {
          status: 'success',
          message: 'Profile updated',
          redirect_url: '/settings/profile',
        };
      },
      button: {
        title: t('edit.buttons.submit'),
      },
    },
  };

  return (
    <div className="space-y-8">
      <FormCard
        title={t('edit.title')}
        description={t('edit.description')}
        form={form}
      />
      <CommunityUsernameForm
        current={communityProfile.username}
        isZh={locale === 'zh'}
      />
      {communityProfile.username ? (
        <div className="rounded-xl border p-5">
          <h2 className="font-semibold">
            {locale === 'zh' ? '我的公开主页' : 'My public profile'}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {locale === 'zh'
              ? '主页审核通过并发布后，其他用户可以通过这个地址查看。'
              : 'Other users can view this URL after your profile is approved and published.'}
          </p>
          <Link
            href={`/u/${communityProfile.username}`}
            target="_blank"
            className="text-primary mt-4 inline-flex text-sm font-medium"
          >
            {locale === 'zh' ? '查看我的公开主页' : 'View my public profile'}
          </Link>
        </div>
      ) : null}
      <div>
        <h2 className="text-2xl font-semibold">
          {locale === 'zh' ? '公开主页内容' : 'Public profile content'}
        </h2>
        <p className="text-muted-foreground mt-2">
          {locale === 'zh'
            ? '填写模板后保存草稿并提交审核。审核期间，已经发布的版本继续展示。'
            : 'Complete the template, save a draft, and submit it for moderation. The published version remains visible during review.'}
        </p>
        <div className="mt-6">
          <CommunityProfileEditor locale={locale} />
        </div>
      </div>
    </div>
  );
}
