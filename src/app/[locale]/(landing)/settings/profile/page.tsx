import { getTranslations } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Empty } from '@/shared/blocks/common';
import { CommunityProfileEditor } from '@/shared/blocks/community/profile-editor';
import { CommunityUsernameForm } from '@/shared/blocks/community/username-form';
import { FormCard } from '@/shared/blocks/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
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
    <Tabs defaultValue="public" className="space-y-6">
      <TabsList className="h-auto w-full justify-start rounded-xl p-1 sm:w-auto">
        <TabsTrigger value="public" className="flex-1 sm:flex-none">
          {locale === 'zh' ? '公开主页' : 'Public profile'}
        </TabsTrigger>
        <TabsTrigger value="account" className="flex-1 sm:flex-none">
          {locale === 'zh' ? '账号资料' : 'Account profile'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="public" className="mt-0 space-y-6">
        <div className="bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {locale === 'zh' ? '你的站内主页' : 'Your WebTools profile'}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              {locale === 'zh'
                ? '只填写公开名称也可以生成主页；作品、经历和外部链接都不是必填项。修改已发布内容后，需要重新提交审核。'
                : 'A display name is enough to create a profile. Works, experience, and external links are optional. Changes to published content must be reviewed again.'}
            </p>
          </div>
          {communityProfile.username ? (
            <Link
              href={`/u/${communityProfile.username}`}
              target="_blank"
              className="border-border hover:bg-muted inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-sm font-medium"
            >
              {locale === 'zh' ? '查看公开主页' : 'View public profile'}
            </Link>
          ) : null}
        </div>
        <CommunityUsernameForm
          current={communityProfile.username}
          isZh={locale === 'zh'}
        />
        <CommunityProfileEditor locale={locale} />
      </TabsContent>

      <TabsContent value="account" className="mt-0">
        <FormCard
          title={t('edit.title')}
          description={t('edit.description')}
          form={form}
        />
      </TabsContent>
    </Tabs>
  );
}
