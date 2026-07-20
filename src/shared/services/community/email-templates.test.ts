import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCommunityEmailTemplate } from './email-templates';

for (const locale of ['zh', 'en'] as const) {
  test(`${locale} community email templates include HTML, text and one CTA`, () => {
    const common = {
      locale,
      appName: 'WebTools',
      ctaUrl: 'https://webtools.test/action',
      preferencesUrl: 'https://webtools.test/settings/community/email',
      recipientName: 'Maker',
    };
    const templates = [
      renderCommunityEmailTemplate('pending_comment_reminder', {
        ...common,
        pendingCount: 3,
      }),
      renderCommunityEmailTemplate('article_approved', {
        ...common,
        articleTitle: 'First launch',
        publishedAt: new Date('2026-07-20T00:00:00Z'),
      }),
      renderCommunityEmailTemplate('article_changes_requested', {
        ...common,
        articleTitle: 'First launch',
        reason: '<script>unsafe</script>',
        reviewOutcome: 'changes_requested',
      }),
    ];
    for (const template of templates) {
      assert.ok(template.subject);
      assert.match(template.html, /https:\/\/webtools\.test\/action/);
      assert.match(template.text, /https:\/\/webtools\.test\/action/);
      assert.equal((template.html.match(/<a href=/g) || []).length, 2);
      assert.equal(template.html.includes('<script>unsafe</script>'), false);
      assert.equal(template.html.includes('Provider'), false);
    }
  });
}
