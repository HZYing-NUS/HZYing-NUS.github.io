'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Privacy = {
  showFollowingList: boolean;
  showFollowerList: boolean;
  showLikes: boolean;
  showBookmarks: boolean;
};

export function CommunityPrivacySettings({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [value, setValue] = useState<Privacy>({
    showFollowingList: true,
    showFollowerList: true,
    showLikes: true,
    showBookmarks: true,
  });
  const [message, setMessage] = useState('');
  useEffect(() => {
    void fetch('/api/community/me/privacy')
      .then((response) => response.json())
      .then((result) => result.data && setValue(result.data));
  }, []);
  const save = async () => {
    const response = await fetch('/api/community/me/privacy', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
    });
    const result = await response.json();
    setMessage(
      result.code === 0
        ? zh
          ? '隐私设置已保存。'
          : 'Privacy saved.'
        : result.message
    );
  };
  const labels: Array<[keyof Privacy, string, string]> = [
    ['showFollowingList', '公开关注名单', 'Show following list'],
    ['showFollowerList', '公开粉丝名单', 'Show follower list'],
    ['showLikes', '公开点赞记录', 'Show likes'],
    ['showBookmarks', '公开收藏记录', 'Show bookmarks'],
  ];
  return (
    <div className="space-y-4">
      {labels.map(([key, labelZh, labelEn]) => (
        <label
          key={key}
          className="flex items-center justify-between rounded-xl border p-4"
        >
          <span>{zh ? labelZh : labelEn}</span>
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(event) =>
              setValue({ ...value, [key]: event.target.checked })
            }
          />
        </label>
      ))}
      <button
        onClick={save}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2"
      >
        {zh ? '保存' : 'Save'}
      </button>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}

type EmailPreferences = {
  pendingCommentReminder: boolean;
  articleReviewResult: boolean;
  productMarketing: boolean;
};

export function CommunityEmailPreferencesSettings({
  locale,
}: {
  locale: string;
}) {
  const zh = locale === 'zh';
  const [value, setValue] = useState<EmailPreferences>({
    pendingCommentReminder: true,
    articleReviewResult: true,
    productMarketing: true,
  });
  const [message, setMessage] = useState('');
  useEffect(() => {
    void fetch('/api/community/me/email-preferences')
      .then((response) => response.json())
      .then((result) => result.code === 0 && setValue(result.data));
  }, []);
  const save = async () => {
    const result = await fetch('/api/community/me/email-preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
    }).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '邮件偏好已保存。'
          : 'Email preferences saved.'
        : result.message
    );
  };
  const labels: Array<[keyof EmailPreferences, string, string]> = [
    ['pendingCommentReminder', '待审核评论提醒', 'Pending comment reminders'],
    ['articleReviewResult', '文章审核结果', 'Article review results'],
    ['productMarketing', '产品营销邮件', 'Product marketing emails'],
  ];
  return (
    <div className="space-y-4">
      {labels.map(([key, labelZh, labelEn]) => (
        <label
          key={key}
          className="flex items-center justify-between rounded-xl border p-4"
        >
          <span>{zh ? labelZh : labelEn}</span>
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(event) =>
              setValue({ ...value, [key]: event.target.checked })
            }
          />
        </label>
      ))}
      <p className="text-muted-foreground text-sm">
        {zh
          ? '三类偏好相互独立。营销邮件合规仍需在正式上线前人工复核。'
          : 'Each preference is independent. Marketing compliance still requires a manual launch review.'}
      </p>
      <button
        onClick={save}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2"
      >
        {zh ? '保存' : 'Save'}
      </button>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}

export function CommunityListsManager({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [lists, setLists] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [itemInputs, setItemInputs] = useState<
    Record<
      string,
      { itemType: 'resource' | 'collection' | 'article'; itemId: string }
    >
  >({});
  const load = useCallback(async () => {
    const result = await fetch('/api/community/me/lists').then((response) =>
      response.json()
    );
    if (result.code === 0) setLists(result.data || []);
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await fetch(
      editingId
        ? `/api/community/me/lists/${editingId}`
        : '/api/community/me/lists',
      {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, slug, description, visibility }),
      }
    ).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? editingId
            ? '内容夹已更新并进入审核。'
            : '内容夹已保存并进入审核。'
          : editingId
            ? 'List updated and queued for moderation.'
            : 'List saved and queued for moderation.'
        : result.message
    );
    if (result.code === 0) {
      setTitle('');
      setSlug('');
      setDescription('');
      setVisibility('public');
      setEditingId(null);
      await load();
    }
  };
  const editList = (list: any) => {
    setEditingId(list.id);
    setTitle(list.title);
    setSlug(list.slug);
    setDescription(list.description || '');
    setVisibility(list.visibility === 'private' ? 'private' : 'public');
  };
  const deleteList = async (listId: string) => {
    const result = await fetch(`/api/community/me/lists/${listId}`, {
      method: 'DELETE',
    }).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '内容夹已删除。'
          : 'List deleted.'
        : result.message
    );
    if (result.code === 0) {
      if (editingId === listId) {
        setEditingId(null);
        setTitle('');
        setSlug('');
        setDescription('');
      }
      await load();
    }
  };
  const addItem = async (listId: string) => {
    const input = itemInputs[listId];
    if (!input?.itemId.trim()) return;
    const result = await fetch(`/api/community/me/lists/${listId}/items`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...input,
        itemId: input.itemId.trim(),
        active: true,
      }),
    }).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '内容已加入内容夹。'
          : 'Item added to the list.'
        : result.message
    );
    if (result.code === 0) {
      setItemInputs({
        ...itemInputs,
        [listId]: { ...input, itemId: '' },
      });
      await load();
    }
  };
  const removeItem = async (
    listId: string,
    itemType: 'resource' | 'collection' | 'article',
    itemId: string
  ) => {
    const result = await fetch(`/api/community/me/lists/${listId}/items`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, active: false }),
    }).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '内容已从内容夹移除。'
          : 'Item removed from the list.'
        : result.message
    );
    if (result.code === 0) await load();
  };
  return (
    <div>
      <form onSubmit={submit} className="grid gap-3 rounded-xl border p-5">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={zh ? '名称' : 'Title'}
          className="rounded-lg border bg-transparent p-3"
        />
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className="rounded-lg border bg-transparent p-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={zh ? '介绍' : 'Description'}
          className="rounded-lg border bg-transparent p-3"
        />
        <select
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as 'public' | 'private')
          }
          className="rounded-lg border bg-transparent p-3"
        >
          <option value="public">
            {zh ? '公开（默认）' : 'Public (default)'}
          </option>
          <option value="private">{zh ? '私密' : 'Private'}</option>
        </select>
        <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2">
          {editingId
            ? zh
              ? '保存内容夹'
              : 'Save list'
            : zh
              ? '创建内容夹'
              : 'Create list'}
        </button>
        {editingId && (
          <button
            type="button"
            className="rounded-lg border px-4 py-2"
            onClick={() => {
              setEditingId(null);
              setTitle('');
              setSlug('');
              setDescription('');
              setVisibility('public');
            }}
          >
            {zh ? '取消编辑' : 'Cancel edit'}
          </button>
        )}
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
      <div className="mt-6 grid gap-3">
        {lists.map((list) => (
          <div key={list.id} className="rounded-xl border p-4">
            <p className="font-medium">{list.title}</p>
            <p className="text-muted-foreground text-sm">
              {list.visibility} · {list.moderationStatus}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              {list.visibility === 'private'
                ? zh
                  ? '私密内容夹仅你和管理员可见。'
                  : 'This private list is visible only to you and administrators.'
                : zh
                  ? '公开内容夹可通过个人资料分享。'
                  : 'This public list can be shared from your profile.'}
            </p>
            <div className="mt-4 space-y-2">
              {(list.items || []).map((item: any) => (
                <div
                  key={`${item.itemType}-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <span className="text-muted-foreground mr-2 text-xs">
                      {item.itemType === 'resource'
                        ? zh
                          ? '资源'
                          : 'Resource'
                        : item.itemType === 'collection'
                          ? zh
                            ? '行动专题'
                            : 'Action guide'
                          : zh
                            ? '文章'
                            : 'Article'}
                    </span>
                    {zh
                      ? item.titleZh || item.slug
                      : item.titleEn || item.titleZh || item.slug}
                  </div>
                  <button
                    type="button"
                    className="text-destructive shrink-0"
                    onClick={() =>
                      void removeItem(list.id, item.itemType, item.id)
                    }
                  >
                    {zh ? '移除' : 'Remove'}
                  </button>
                </div>
              ))}
              {(list.items || []).length === 0 && (
                <p className="text-muted-foreground text-sm">
                  {zh ? '内容夹中暂无内容。' : 'This list is empty.'}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => editList(list)}
              >
                {zh ? '编辑' : 'Edit'}
              </button>
              <button
                type="button"
                className="text-destructive rounded-lg border px-3 py-2 text-sm"
                onClick={() => void deleteList(list.id)}
              >
                {zh ? '删除' : 'Delete'}
              </button>
              <select
                value={itemInputs[list.id]?.itemType || 'resource'}
                onChange={(event) =>
                  setItemInputs({
                    ...itemInputs,
                    [list.id]: {
                      itemId: itemInputs[list.id]?.itemId || '',
                      itemType: event.target.value as
                        | 'resource'
                        | 'collection'
                        | 'article',
                    },
                  })
                }
                className="rounded-lg border bg-transparent px-3 py-2 text-sm"
              >
                <option value="resource">{zh ? '资源' : 'Resource'}</option>
                <option value="collection">
                  {zh ? '行动专题' : 'Action guide'}
                </option>
                <option value="article">{zh ? '文章' : 'Article'}</option>
              </select>
              <input
                value={itemInputs[list.id]?.itemId || ''}
                onChange={(event) =>
                  setItemInputs({
                    ...itemInputs,
                    [list.id]: {
                      itemType: itemInputs[list.id]?.itemType || 'resource',
                      itemId: event.target.value,
                    },
                  })
                }
                placeholder={zh ? '内容 ID' : 'Content ID'}
                className="min-w-48 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => void addItem(list.id)}
              >
                {zh ? '加入' : 'Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommunityCommentsManager({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [rows, setRows] = useState<any>({ mine: [], pendingForMyArticles: [] });
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reasonType, setReasonType] = useState('spam_scam');
  const [reportDescription, setReportDescription] = useState('');
  const load = useCallback(async () => {
    const result = await fetch('/api/community/me/comments').then((response) =>
      response.json()
    );
    if (result.code === 0) setRows(result.data);
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const action = async (id: string, value: string) => {
    await fetch(`/api/community/comments/${id}/author-action`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        value === 'report'
          ? { action: value, reasonType, description: reportDescription }
          : { action: value }
      ),
    });
    setReportingId(null);
    setReportDescription('');
    await load();
  };
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold">
          {zh ? '我的文章评论' : 'Comments on my articles'}
        </h2>
        <div className="mt-4 space-y-3">
          {rows.pendingForMyArticles.map((comment: any) => (
            <div key={comment.id} className="rounded-xl border p-4">
              <p>{comment.content}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {comment.status}
              </p>
              {comment.status === 'pending_author' && (
                <div className="mt-3 flex gap-3 text-sm">
                  <button onClick={() => action(comment.id, 'publish')}>
                    {zh ? '公开' : 'Publish'}
                  </button>
                  <button onClick={() => action(comment.id, 'feature')}>
                    {zh ? '精选' : 'Feature'}
                  </button>
                  <button onClick={() => action(comment.id, 'reject')}>
                    {zh ? '拒绝' : 'Reject'}
                  </button>
                  <button onClick={() => setReportingId(comment.id)}>
                    {zh ? '举报' : 'Report'}
                  </button>
                </div>
              )}
              {reportingId === comment.id && (
                <div className="mt-4 grid gap-3 rounded-lg border p-3">
                  <select
                    value={reasonType}
                    onChange={(event) => setReasonType(event.target.value)}
                    className="rounded-lg border bg-transparent p-2 text-sm"
                  >
                    <ReportReasonOptions zh={zh} />
                  </select>
                  <textarea
                    value={reportDescription}
                    onChange={(event) =>
                      setReportDescription(event.target.value)
                    }
                    placeholder={zh ? '补充说明（可选）' : 'Details (optional)'}
                    className="rounded-lg border bg-transparent p-2 text-sm"
                  />
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => action(comment.id, 'report')}>
                      {zh ? '提交举报' : 'Submit report'}
                    </button>
                    <button onClick={() => setReportingId(null)}>
                      {zh ? '取消' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">
          {zh ? '我的评论' : 'My comments'}
        </h2>
        <div className="mt-4 space-y-3">
          {rows.mine.map((comment: any) => (
            <div key={comment.id} className="rounded-xl border p-4">
              <p>{comment.content}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {comment.status}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportReasonOptions({ zh }: { zh: boolean }) {
  const reasons = [
    ['spam_scam', '垃圾或诈骗', 'Spam or scam'],
    ['harassment_hate', '骚扰或仇恨', 'Harassment or hate'],
    ['illegal_dangerous', '违法或危险内容', 'Illegal or dangerous'],
    ['privacy_exposure', '隐私泄露', 'Privacy exposure'],
    ['sexual_content', '色情内容', 'Sexual content'],
    ['impersonation', '冒充他人', 'Impersonation'],
    ['other', '其他违规', 'Other violation'],
  ];
  return (
    <>
      {reasons.map(([value, labelZh, labelEn]) => (
        <option key={value} value={value}>
          {zh ? labelZh : labelEn}
        </option>
      ))}
    </>
  );
}

export function CommunityRelationshipsManager({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [rows, setRows] = useState<any>({ following: [], followers: [] });
  useEffect(() => {
    void fetch('/api/community/me/relationships')
      .then((response) => response.json())
      .then((result) => result.code === 0 && setRows(result.data));
  }, []);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {(['following', 'followers'] as const).map((key) => (
        <section key={key}>
          <h2 className="text-xl font-semibold">
            {key === 'following'
              ? zh
                ? '我的关注'
                : 'Following'
              : zh
                ? '我的粉丝'
                : 'Followers'}
          </h2>
          <div className="mt-4 space-y-3">
            {rows[key].map((item: any) => (
              <a
                key={item.userId}
                href={`/${locale}/u/${item.username}`}
                className="block rounded-xl border p-4"
              >
                {item.displayName}{' '}
                <span className="text-muted-foreground">@{item.username}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CommunityBookmarksManager({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [bookmarks, setBookmarks] = useState<
    Record<
      string,
      Array<{
        id: string;
        slug: string;
        title: string;
        titleEn?: string | null;
        username?: string | null;
      }>
    >
  >({ resources: [], collections: [], articles: [], lists: [] });
  useEffect(() => {
    void fetch('/api/community/me/bookmarks')
      .then((response) => response.json())
      .then((result) => result.code === 0 && setBookmarks(result.data));
  }, []);
  const sections: Array<[keyof typeof bookmarks, string, string]> = [
    ['resources', '资源收藏', 'Saved resources'],
    ['collections', '行动专题收藏', 'Saved action guides'],
    ['articles', '文章收藏', 'Saved articles'],
    ['lists', '内容夹收藏', 'Saved lists'],
  ];
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {sections.map(([key, labelZh, labelEn]) => (
        <section key={key}>
          <h2 className="text-xl font-semibold">{zh ? labelZh : labelEn}</h2>
          <div className="mt-3 space-y-2">
            {bookmarks[key].map((item) => (
              <a
                key={item.id}
                href={
                  key === 'lists'
                    ? `/${locale}/u/${item.username}/lists/${item.slug}`
                    : `/${locale}/${key === 'resources' ? 'resources' : key === 'collections' ? 'collections' : 'blog'}/${item.slug}`
                }
                className="block rounded-lg border p-3 text-sm"
              >
                {zh ? item.title : item.titleEn || item.title}
              </a>
            ))}
            {bookmarks[key].length === 0 && (
              <p className="text-muted-foreground text-sm">
                {zh ? '暂无收藏。' : 'No saved items yet.'}
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
