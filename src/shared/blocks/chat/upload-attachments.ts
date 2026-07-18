import type { PromptInputMessage } from '@/shared/components/ai-elements/prompt-input';

export async function uploadChatAttachments(
  chatId: string,
  files: NonNullable<PromptInputMessage['files']>
) {
  if (!files.length) return [];
  const form = new FormData();
  form.set('chatId', chatId);
  for (const [index, item] of files.entries()) {
    if (!item.url) continue;
    const blob = await fetch(item.url).then((response) => response.blob());
    form.append(
      'files',
      new File([blob], item.filename || `attachment-${index + 1}`, {
        type: item.mediaType || blob.type,
      })
    );
  }
  const payload = await fetch('/api/files', {
    method: 'POST',
    body: form,
  }).then((response) => response.json());
  if (payload.code !== 0) throw new Error(payload.message || 'UPLOAD_FAILED');
  return (payload.data as Array<{ id: string }>).map((file) => file.id);
}
