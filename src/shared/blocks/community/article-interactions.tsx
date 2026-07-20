'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type CommentRow = {
  comment: {
    id: string;
    userId: string;
    parentId: string | null;
    depth: number;
    content: string | null;
    status: string;
    featured: boolean;
  };
  username: string | null;
  displayName: string | null;
  likeCount: number;
  liked: boolean;
};

export function CommunityArticleInteractions({
  articleId,
  currentUserIsAuthor,
  currentUserId,
  allowComments,
  allowReplies,
  locale,
}: {
  articleId: string;
  currentUserIsAuthor: boolean;
  currentUserId?: string | null;
  allowComments: boolean;
  allowReplies: boolean;
  locale: string;
}) {
  const zh = locale === 'zh';
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reasonType, setReasonType] = useState('spam_scam');
  const [reportDescription, setReportDescription] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/community/articles/${articleId}/comments`
    );
    const result = await response.json();
    if (result.code === 0) setComments(result.data || []);
  }, [articleId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(
      `/api/community/articles/${articleId}/comments`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, parentId: replyTo }),
      }
    );
    const result = await response.json();
    setMessage(
      result.code === 0
        ? zh
          ? '已提交审核。'
          : 'Submitted for moderation.'
        : result.message
    );
    if (result.code === 0) {
      setContent('');
      setReplyTo(null);
      await load();
    }
  };

  const action = async (commentId: string, value: string) => {
    if (value === 'delete') {
      const response = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      setMessage(
        result.code === 0
          ? zh
            ? '评论已删除。'
            : 'Comment deleted.'
          : result.message
      );
      if (result.code === 0) await load();
      return;
    }
    const body: Record<string, string> = { action: value };
    if (value === 'report') {
      body.reasonType = reasonType;
      body.description = reportDescription;
    }
    const response = await fetch(
      `/api/community/comments/${commentId}/author-action`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const result = await response.json();
    setMessage(
      result.code === 0
        ? zh
          ? '操作已保存。'
          : 'Action saved.'
        : result.message
    );
    if (result.code === 0) await load();
    if (result.code === 0) {
      setReportingId(null);
      setReportDescription('');
    }
  };

  const like = async (commentId: string, active: boolean) => {
    if (!currentUserId) return;
    await fetch('/api/community/interactions/like', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        targetType: 'comment',
        targetId: commentId,
        active,
      }),
    });
    await load();
  };

  const roots = comments.filter((item) => item.comment.depth === 0);
  return (
    <section className="mt-16 border-t pt-10">
      <h2 className="text-2xl font-semibold">{zh ? '评论' : 'Comments'}</h2>
      {currentUserId && (replyTo ? allowReplies : allowComments) ? (
        <form className="mt-6" onSubmit={submit}>
          {replyTo && (
            <p className="text-muted-foreground mb-2 text-sm">
              {zh ? '正在回复评论' : 'Replying to a comment'}
              <button
                type="button"
                className="ml-3 underline"
                onClick={() => setReplyTo(null)}
              >
                {zh ? '取消' : 'Cancel'}
              </button>
            </p>
          )}
          <textarea
            required
            maxLength={10000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-28 w-full rounded-xl border bg-transparent p-3"
            placeholder={zh ? '分享你的经验……' : 'Share your experience...'}
          />
          <button className="bg-primary text-primary-foreground mt-3 rounded-lg px-4 py-2 text-sm">
            {zh ? '提交评论' : 'Submit comment'}
          </button>
        </form>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          {!currentUserId
            ? zh
              ? '登录后可以评论和回复。'
              : 'Sign in to comment and reply.'
            : !allowComments && allowReplies
              ? zh
                ? '作者已关闭新增一级评论，仍可回复已公开评论。'
                : 'New first-level comments are disabled, but published comments can still receive replies.'
              : zh
                ? '作者已关闭新增评论。'
                : 'New comments are disabled.'}
        </p>
      )}
      {message && <p className="mt-3 text-sm">{message}</p>}
      <div className="mt-8 space-y-6">
        {roots.map((root) => (
          <div key={root.comment.id} className="rounded-xl border p-4">
            <CommentContent row={root} zh={zh} />
            <CommentActions
              row={root}
              zh={zh}
              canReply={Boolean(
                currentUserId &&
                  allowReplies &&
                  root.comment.status === 'published'
              )}
              isAuthor={currentUserIsAuthor}
              isOwner={currentUserId === root.comment.userId}
              onReply={() => setReplyTo(root.comment.id)}
              onLike={like}
              onAction={action}
              canLike={Boolean(currentUserId)}
              reporting={reportingId === root.comment.id}
              onReport={() => setReportingId(root.comment.id)}
            />
            {reportingId === root.comment.id && (
              <ReportForm
                zh={zh}
                reasonType={reasonType}
                description={reportDescription}
                onReasonChange={setReasonType}
                onDescriptionChange={setReportDescription}
                onSubmit={() => action(root.comment.id, 'report')}
                onCancel={() => setReportingId(null)}
              />
            )}
            <div className="mt-4 space-y-3 border-l pl-4">
              {comments
                .filter((item) => item.comment.parentId === root.comment.id)
                .map((reply) => (
                  <div key={reply.comment.id}>
                    <CommentContent row={reply} zh={zh} />
                    <CommentActions
                      row={reply}
                      zh={zh}
                      canReply={false}
                      isAuthor={currentUserIsAuthor}
                      isOwner={currentUserId === reply.comment.userId}
                      onReply={() => undefined}
                      onLike={like}
                      onAction={action}
                      canLike={Boolean(currentUserId)}
                      reporting={false}
                      onReport={() => undefined}
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommentContent({ row, zh }: { row: CommentRow; zh: boolean }) {
  const labels: Record<string, string> = {
    moderation_pending: zh ? '审核中' : 'Moderating',
    pending_admin: zh ? '平台复核中' : 'Platform review',
    pending_author: zh ? '等待作者审核' : 'Awaiting author review',
    blocked: zh ? '已被平台阻断' : 'Blocked',
    rejected: zh ? '作者未公开' : 'Not published by author',
    hidden: zh ? '已被作者隐藏' : 'Hidden by author',
    reported: zh ? '已举报平台' : 'Reported',
    closed_unhandled: zh ? '作者未处理' : 'Closed without action',
  };
  return (
    <div>
      <p className="text-sm font-medium">
        {row.displayName || row.username || (zh ? '用户' : 'User')}
        {row.comment.featured && (
          <span className="ml-2 text-xs">{zh ? '精选' : 'Featured'}</span>
        )}
      </p>
      <p className="mt-2 whitespace-pre-wrap">
        {row.comment.content ||
          (zh
            ? '该评论已被用户删除'
            : 'This comment was deleted by its author')}
      </p>
      {row.comment.status !== 'published' && (
        <p className="text-muted-foreground mt-2 text-xs">
          {labels[row.comment.status] || row.comment.status}
        </p>
      )}
    </div>
  );
}

function CommentActions({
  row,
  zh,
  canReply,
  isAuthor,
  isOwner,
  onReply,
  onLike,
  onAction,
  canLike,
  reporting,
  onReport,
}: {
  row: CommentRow;
  zh: boolean;
  canReply: boolean;
  isAuthor: boolean;
  isOwner: boolean;
  onReply: () => void;
  onLike: (id: string, active: boolean) => void;
  onAction: (id: string, action: string) => void;
  canLike: boolean;
  reporting: boolean;
  onReport: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
      {row.comment.status === 'published' &&
        (canLike ? (
          <button onClick={() => onLike(row.comment.id, !row.liked)}>
            {row.liked ? (zh ? '取消赞' : 'Unlike') : zh ? '点赞' : 'Like'}{' '}
            {Number(row.likeCount)}
          </button>
        ) : (
          <span className="text-muted-foreground">
            {zh ? '点赞' : 'Likes'} {Number(row.likeCount)} ·{' '}
            {zh ? '登录后可点赞' : 'Sign in to like'}
          </span>
        ))}
      {canReply && <button onClick={onReply}>{zh ? '回复' : 'Reply'}</button>}
      {isAuthor &&
        row.comment.depth === 0 &&
        row.comment.status === 'pending_author' && (
          <>
            <button onClick={() => onAction(row.comment.id, 'publish')}>
              {zh ? '公开' : 'Publish'}
            </button>
            <button onClick={() => onAction(row.comment.id, 'feature')}>
              {zh ? '精选并公开' : 'Feature'}
            </button>
            <button onClick={() => onAction(row.comment.id, 'reject')}>
              {zh ? '拒绝' : 'Reject'}
            </button>
            <button disabled={reporting} onClick={onReport}>
              {reporting
                ? zh
                  ? '填写举报信息'
                  : 'Complete report'
                : zh
                  ? '举报'
                  : 'Report'}
            </button>
          </>
        )}
      {isAuthor && row.comment.status === 'published' && (
        <button onClick={() => onAction(row.comment.id, 'hide')}>
          {zh ? '隐藏' : 'Hide'}
        </button>
      )}
      {isAuthor && row.comment.status === 'hidden' && (
        <button onClick={() => onAction(row.comment.id, 'restore')}>
          {zh ? '重新审核并恢复' : 'Re-moderate and restore'}
        </button>
      )}
      {isOwner && row.comment.status !== 'deleted' && (
        <button
          onClick={() => onAction(row.comment.id, 'delete')}
          className="text-destructive"
        >
          {zh ? '删除评论' : 'Delete comment'}
        </button>
      )}
    </div>
  );
}

function ReportForm({
  zh,
  reasonType,
  description,
  onReasonChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: {
  zh: boolean;
  reasonType: string;
  description: string;
  onReasonChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
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
    <div className="mt-4 grid gap-3 rounded-lg border p-3">
      <select
        value={reasonType}
        onChange={(event) => onReasonChange(event.target.value)}
        className="rounded-lg border bg-transparent p-2 text-sm"
      >
        {reasons.map(([value, labelZh, labelEn]) => (
          <option key={value} value={value}>
            {zh ? labelZh : labelEn}
          </option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder={zh ? '补充说明（可选）' : 'Details (optional)'}
        className="rounded-lg border bg-transparent p-2 text-sm"
      />
      <div className="flex gap-3 text-sm">
        <button onClick={onSubmit}>{zh ? '提交举报' : 'Submit report'}</button>
        <button onClick={onCancel}>{zh ? '取消' : 'Cancel'}</button>
      </div>
    </div>
  );
}
