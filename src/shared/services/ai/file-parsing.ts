import { generateId } from 'ai';

import {
  claimAiFileParsing,
  commitAiFileParsingForClaim,
  completeAiFileParsing,
  findAiFile,
} from '@/shared/models/ai_file';
import {
  getFileParseClaimTtlMs,
  type FileParseResult,
} from '@/shared/services/ai/file-parse-policy';
import { getStorageService } from '@/shared/services/storage';

export async function parseAiFile(
  fileId: string,
  userId: string,
  claimId: string
): Promise<
  FileParseResult<NonNullable<Awaited<ReturnType<typeof findAiFile>>>>
> {
  const file = await findAiFile(fileId, userId);
  if (!file) throw new Error('FILE_NOT_FOUND');
  if (file.parseStatus === 'parsed' || file.parseStatus === 'visual') {
    return { status: 'reused', file, chargeable: false };
  }
  if (
    !['text/plain', 'text/markdown', 'application/pdf'].includes(file.mimeType)
  ) {
    return { status: 'reused', file, chargeable: false };
  }

  const claimTtlMs = getFileParseClaimTtlMs(
    process.env.AI_FILE_PARSE_CLAIM_TTL_MS
  );
  const claimed = await claimAiFileParsing(
    file.id,
    userId,
    claimId,
    claimTtlMs
  );
  if (!claimed) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const current = await findAiFile(file.id, userId);
      if (!current || current.parseStatus !== 'parsing') {
        return { status: 'reused', file: current, chargeable: false };
      }
    }
    return { status: 'in_progress', chargeable: false };
  }
  return parseFile(claimed, userId, claimId);
}

async function parseFile(
  file: NonNullable<Awaited<ReturnType<typeof findAiFile>>>,
  userId: string,
  claimId: string
): Promise<
  FileParseResult<NonNullable<Awaited<ReturnType<typeof findAiFile>>>>
> {
  const object = await (
    await getStorageService()
  ).getObject({ key: file.objectKey });
  const bytes = new Uint8Array(
    await new Response(object.body as BodyInit).arrayBuffer()
  );
  let parsedText = '';
  try {
    if (file.mimeType === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: bytes });
      try {
        parsedText = (await parser.getText()).text.trim();
      } finally {
        await parser.destroy().catch(() => undefined);
      }
      if (!parsedText) throw new Error('PDF_TEXT_EMPTY');
    } else {
      parsedText = new TextDecoder().decode(bytes);
    }
    const chunks = [];
    for (let offset = 0; offset < parsedText.length; offset += 3000) {
      const content = parsedText.slice(offset, offset + 3500);
      chunks.push({
        id: generateId().toLowerCase(),
        chunkIndex: chunks.length,
        content,
        tokenCount: Math.ceil(content.length / 3),
        status: 'active',
      });
    }
    const completed = await commitAiFileParsingForClaim({
      id: file.id,
      userId,
      claimId,
      chunks,
    });
    if (!completed) return { status: 'in_progress', chargeable: false };
    return {
      status: 'parsed',
      file: completed,
      chargeable: true,
      attemptId: claimId,
    };
  } catch (error) {
    const completed = await completeAiFileParsing({
      id: file.id,
      userId,
      claimId,
      parseStatus: 'failed',
      parseError: error instanceof Error ? error.message : 'FILE_PARSE_FAILED',
      parseCostUsd: file.parseCostUsd || '0',
      chargeable: false,
    });
    if (!completed) return { status: 'in_progress', chargeable: false };
    return {
      status: 'failed',
      chargeable: true,
      attemptId: claimId,
      error: error instanceof Error ? error : new Error('FILE_PARSE_FAILED'),
    };
  }
}
