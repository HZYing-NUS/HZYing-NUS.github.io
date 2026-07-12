import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getSignUser } from '@/shared/models/user';
import { createSubmission, submissionTypes } from '@/shared/models/submission';

export async function POST(request: NextRequest) {
  const user = await getSignUser();
  if (!user) return respErr('Please sign in before submitting a suggestion.');

  const body = await request.json();
  const type = String(body.type || '');
  const title = String(body.title || '').trim();
  if (!submissionTypes.includes(type as (typeof submissionTypes)[number]) || !title) {
    return respErr('A valid submission type and title are required.');
  }

  const item = await createSubmission({
    type: type as (typeof submissionTypes)[number],
    title,
    url: String(body.url || '').trim() || null,
    description: String(body.description || '').trim() || null,
    suggestedTags: String(body.suggestedTags || '').trim() || null,
    relatedContentType: String(body.relatedContentType || '').trim() || null,
    relatedContentId: String(body.relatedContentId || '').trim() || null,
    submitterUserId: user.id,
  });

  return respData(item);
}
