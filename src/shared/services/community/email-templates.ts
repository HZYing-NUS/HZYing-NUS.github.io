export type CommunityEmailLocale = 'zh' | 'en';
export type CommunityEmailType =
  | 'pending_comment_reminder'
  | 'article_approved'
  | 'article_changes_requested';

export type CommunityEmailTemplate = {
  subject: string;
  html: string;
  text: string;
  version: string;
};

type TemplateInput = {
  locale: CommunityEmailLocale;
  appName: string;
  ctaUrl: string;
  preferencesUrl: string;
  recipientName?: string | null;
  articleTitle?: string | null;
  publishedAt?: Date | null;
  reason?: string | null;
  pendingCount?: number;
  reviewOutcome?: 'changes_requested' | 'rejected';
};

export const COMMUNITY_EMAIL_TEMPLATE_VERSION = 'community-email-v1';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderLayout({
  locale,
  appName,
  heading,
  body,
  bodyText,
  ctaLabel,
  ctaUrl,
  preferencesUrl,
}: {
  locale: CommunityEmailLocale;
  appName: string;
  heading: string;
  body: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  preferencesUrl: string;
}) {
  const why =
    locale === 'zh'
      ? `你收到这封邮件，是因为你在 ${appName} 开启了对应的社区邮件提醒。`
      : `You received this email because the corresponding community notification is enabled for your ${appName} account.`;
  const manage = locale === 'zh' ? '管理邮件偏好' : 'Manage email preferences';
  const safeHeading = escapeHtml(heading);
  const safeAppName = escapeHtml(appName);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const safePreferencesUrl = escapeHtml(preferencesUrl);
  return {
    html: `<!doctype html><html lang="${locale}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:#f5f5f4;color:#1c1917;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:16px"><tr><td style="padding:28px"><p style="margin:0 0 24px;font-size:14px;font-weight:700">${safeAppName}</p><h1 style="margin:0 0 18px;font-size:26px;line-height:1.3">${safeHeading}</h1>${body}<p style="margin:28px 0"><a href="${safeCtaUrl}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${escapeHtml(ctaLabel)}</a></p><p style="margin:24px 0 0;color:#78716c;font-size:12px;line-height:1.6">${escapeHtml(why)} <a href="${safePreferencesUrl}" style="color:#57534e">${escapeHtml(manage)}</a></p></td></tr></table></td></tr></table></body></html>`,
    text: `${appName}\n\n${heading}\n\n${bodyText}\n\n${ctaLabel}: ${ctaUrl}\n\n${why}\n${manage}: ${preferencesUrl}`,
  };
}

export function renderCommunityEmailTemplate(
  emailType: CommunityEmailType,
  input: TemplateInput
): CommunityEmailTemplate {
  const name = input.recipientName?.trim();
  const greeting =
    input.locale === 'zh' ? `${name || '你好'}，` : `Hi ${name || 'there'},`;
  if (emailType === 'pending_comment_reminder') {
    const count = Math.max(1, Number(input.pendingCount || 0));
    const heading =
      input.locale === 'zh'
        ? '有评论等待你审核'
        : 'Comments are waiting for your review';
    const message =
      input.locale === 'zh'
        ? `${greeting}你的文章下有 ${count} 条一级评论等待审核。`
        : `${greeting} ${count} first-level ${count === 1 ? 'comment is' : 'comments are'} waiting for review on your articles.`;
    const layout = renderLayout({
      ...input,
      heading,
      body: `<p style="font-size:16px;line-height:1.7">${escapeHtml(message)}</p>`,
      bodyText: message,
      ctaLabel:
        input.locale === 'zh' ? '查看待审核评论' : 'Review pending comments',
    });
    return {
      subject:
        input.locale === 'zh'
          ? `${count} 条评论等待你审核`
          : `${count} ${count === 1 ? 'comment' : 'comments'} awaiting review`,
      ...layout,
      version: COMMUNITY_EMAIL_TEMPLATE_VERSION,
    };
  }

  const title =
    input.articleTitle?.trim() ||
    (input.locale === 'zh' ? '未命名文章' : 'Untitled article');
  if (emailType === 'article_approved') {
    const publishedAt = (input.publishedAt || new Date()).toISOString();
    const heading =
      input.locale === 'zh'
        ? '文章已审核通过并发布'
        : 'Your article is approved and published';
    const message =
      input.locale === 'zh'
        ? `${greeting}《${title}》已于 ${publishedAt} 发布。`
        : `${greeting} “${title}” was published at ${publishedAt}.`;
    const layout = renderLayout({
      ...input,
      heading,
      body: `<p style="font-size:16px;line-height:1.7">${escapeHtml(message)}</p>`,
      bodyText: message,
      ctaLabel:
        input.locale === 'zh' ? '查看已发布文章' : 'View published article',
    });
    return {
      subject:
        input.locale === 'zh'
          ? `文章已发布：《${title}》`
          : `Article published: ${title}`,
      ...layout,
      version: COMMUNITY_EMAIL_TEMPLATE_VERSION,
    };
  }

  const rejected = input.reviewOutcome === 'rejected';
  const heading =
    input.locale === 'zh'
      ? rejected
        ? '文章未通过审核'
        : '文章需要修改'
      : rejected
        ? 'Your article was not approved'
        : 'Your article needs changes';
  const reason =
    input.reason?.trim() ||
    (input.locale === 'zh' ? '未提供原因。' : 'No reason was provided.');
  const message =
    input.locale === 'zh'
      ? `${greeting}《${title}》${rejected ? '未通过审核' : '已退回修改'}。原因：${reason}`
      : `${greeting} “${title}” was ${rejected ? 'not approved' : 'returned for changes'}. Reason: ${reason}`;
  const layout = renderLayout({
    ...input,
    heading,
    body: `<p style="font-size:16px;line-height:1.7">${escapeHtml(message)}</p>`,
    bodyText: message,
    ctaLabel: input.locale === 'zh' ? '修改文章' : 'Edit article',
  });
  return {
    subject:
      input.locale === 'zh'
        ? `${rejected ? '文章未通过审核' : '文章需要修改'}：《${title}》`
        : `${rejected ? 'Article not approved' : 'Changes requested'}: ${title}`,
    ...layout,
    version: COMMUNITY_EMAIL_TEMPLATE_VERSION,
  };
}
