import { createHash } from 'node:crypto';
import { mkdir, stat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { legacyProfileContent } from '../src/config/seed/legacy-content';

const args = new Set(process.argv.slice(2));
const outputArgument = [...args].find((arg) => arg.startsWith('--output='));
const outputPath = outputArgument?.replace('--output=', '') || 'docs/media-migration/legacy-media-manifest.json';
const projectRoot = process.cwd();

type Reference = { locale: 'zh' | 'en'; path: string; sourceUrl: string };
type ManifestItem = {
  sourcePath: string;
  sha256: string;
  bytes: number;
  contentType: string;
  key: string;
  expectedPublicUrl: string | null;
  references: Reference[];
};

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function collectReferences(value: unknown, currentPath = '$', found: Reference[] = []) {
  if (typeof value === 'string') {
    if (value.startsWith('/images/legacy/')) {
      found.push({ locale: 'zh', path: currentPath, sourceUrl: value });
      found.push({ locale: 'en', path: currentPath, sourceUrl: value });
    }
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectReferences(item, `${currentPath}[${index}]`, found));
    return found;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => collectReferences(item, `${currentPath}.${key}`, found));
  }
  return found;
}

async function main() {
  const grouped = new Map<string, Reference[]>();
  for (const reference of collectReferences(legacyProfileContent)) {
    const references = grouped.get(reference.sourceUrl) || [];
    references.push(reference);
    grouped.set(reference.sourceUrl, references);
  }

  const items: ManifestItem[] = [];
  for (const [sourceUrl, references] of grouped) {
    const sourcePath = sourceUrl.replace(/^\//, '');
    const absolutePath = path.join(projectRoot, 'public', sourcePath.replace(/^images\//, 'images/'));
    const buffer = await readFile(absolutePath);
    const info = await stat(absolutePath);
    const extension = path.extname(sourcePath).toLowerCase();
    const contentType = contentTypes[extension];
    if (!contentType) throw new Error(`Unsupported legacy media type: ${sourcePath}`);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const key = `legacy/v1/${sha256}${extension}`;
    items.push({
      sourcePath: `public/${sourcePath}`,
      sha256,
      bytes: info.size,
      contentType,
      key,
      expectedPublicUrl: null,
      references,
    });
  }

  items.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, itemCount: items.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
