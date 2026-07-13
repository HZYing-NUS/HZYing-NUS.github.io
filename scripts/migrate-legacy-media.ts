import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { config } from 'dotenv';

import { getStorageService } from '../src/shared/services/storage';
import { getProfileByLocale, saveProfile } from '../src/shared/models/profile';

const args = new Set(process.argv.slice(2));
const envArgument = [...args].find((arg) => arg.startsWith('--env='));
const manifestArgument = [...args].find((arg) => arg.startsWith('--manifest='));
const envFile = envArgument?.replace('--env=', '');
const manifestPath = manifestArgument?.replace('--manifest=', '') || 'docs/media-migration/legacy-media-manifest.json';
const mode = ['--dry-run', '--upload', '--apply-db', '--verify'].find((arg) => args.has(arg)) || '--dry-run';
const apply = mode === '--upload' || mode === '--apply-db';

if (!envFile) {
  throw new Error('Usage: tsx scripts/migrate-legacy-media.ts --env=<file> --dry-run|--upload|--apply-db|--verify');
}

config({ path: envFile, override: true });

if (apply && process.env.CONFIRM_LEGACY_MEDIA_MIGRATION !== '1') {
  throw new Error('Upload and database apply require CONFIRM_LEGACY_MEDIA_MIGRATION=1.');
}

config({ path: envFile, override: true });

type ManifestItem = {
  sourcePath: string;
  sha256: string;
  bytes: number;
  contentType: string;
  key: string;
  expectedPublicUrl: string | null;
  verifiedAt?: string;
  references: { locale: 'zh' | 'en'; path: string; sourceUrl: string }[];
};

type Manifest = {
  version: number;
  generatedAt: string;
  itemCount: number;
  items: ManifestItem[];
};

const counters = { uploaded: 0, skipped: 0, verified: 0, patchedProfiles: 0, conflicts: 0, errors: 0 };

function setJsonPath(target: unknown, jsonPath: string, value: string) {
  const parts = jsonPath.replace(/^\$\./, '').match(/[^.[\]]+/g) || [];
  let current: any = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    current = current?.[key];
    if (!current || typeof current !== 'object') throw new Error(`Cannot resolve Profile path ${jsonPath}`);
  }
  const finalKey = parts.at(-1);
  if (!finalKey || typeof current?.[finalKey] !== 'string') throw new Error(`Profile path does not point to a string: ${jsonPath}`);
  current[finalKey] = value;
}

async function probe(url: string, expectedContentType: string) {
  const response = await fetch(url, { method: 'HEAD' });
  if (!response.ok) return false;
  const contentType = response.headers.get('content-type') || '';
  return contentType.startsWith(expectedContentType);
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  const storage = await getStorageService();
  const r2 = storage.getProvider('r2');
  if (!r2?.exists || !r2.getPublicUrl) {
    throw new Error('Existing R2 storage provider is not configured. No media was changed.');
  }

  for (const item of manifest.items) {
    const publicUrl = r2.getPublicUrl({ key: item.key });
    if (!publicUrl) throw new Error(`R2 provider cannot generate a public URL for ${item.key}`);

    if (mode === '--dry-run') {
      const exists = await r2.exists({ key: item.key });
      exists ? counters.skipped += 1 : counters.uploaded += 1;
      continue;
    }

    if (mode === '--upload') {
      const exists = await r2.exists({ key: item.key });
      if (exists) {
        counters.skipped += 1;
      } else {
        const body = await readFile(path.join(process.cwd(), item.sourcePath));
        const result = await r2.uploadFile({ body, key: item.key, contentType: item.contentType, disposition: 'inline' });
        if (!result.success) throw new Error(result.error || `Upload failed for ${item.sourcePath}`);
        counters.uploaded += 1;
      }
      if (!await probe(publicUrl, item.contentType)) throw new Error(`Public R2 verification failed for ${publicUrl}`);
      item.expectedPublicUrl = publicUrl;
      item.verifiedAt = new Date().toISOString();
      counters.verified += 1;
      continue;
    }

    if (mode === '--verify') {
      if (!item.expectedPublicUrl || !await probe(item.expectedPublicUrl, item.contentType)) {
        throw new Error(`Manifest URL is not publicly available: ${item.key}`);
      }
      counters.verified += 1;
    }
  }

  if (mode === '--apply-db') {
    const byLocale = new Map<'zh' | 'en', ManifestItem[]>();
    for (const item of manifest.items) {
      if (!item.expectedPublicUrl || !item.verifiedAt) throw new Error(`Media is not verified: ${item.sourcePath}`);
      for (const reference of item.references) {
        const entries = byLocale.get(reference.locale) || [];
        entries.push({ ...item, references: [reference] });
        byLocale.set(reference.locale, entries);
      }
    }

    for (const [locale, items] of byLocale) {
      const profile = await getProfileByLocale(locale);
      if (!profile) throw new Error(`Published Profile not found for ${locale}`);
      const content = structuredClone(profile.content) as Record<string, unknown>;
      for (const item of items) {
        const reference = item.references[0];
        let current: any = content;
        const parts = reference.path.replace(/^\$\./, '').match(/[^.[\]]+/g) || [];
        for (const segment of parts) current = current?.[segment];
        if (current !== reference.sourceUrl && current !== item.expectedPublicUrl) {
          counters.conflicts += 1;
          throw new Error(`Profile content changed at ${reference.path}; refusing to overwrite`);
        }
        setJsonPath(content, reference.path, item.expectedPublicUrl!);
      }
      await saveProfile({ locale, content, status: profile.status, allowAiCitation: profile.allowAiCitation });
      counters.patchedProfiles += 1;
    }
  }

  if (mode === '--upload') {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.table(counters);
}

main().catch((error) => {
  counters.errors += 1;
  console.error(error);
  console.table(counters);
  process.exitCode = 1;
});
