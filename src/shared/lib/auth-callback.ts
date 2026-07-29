import { defaultLocale } from '@/config/locale';

const CALLBACK_BASE_URL = 'https://webtools.invalid';

export function safeInternalCallbackPath(raw?: string | null, fallback = '/') {
  const candidate = String(raw || '').trim();
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(candidate);
    if (
      decoded.startsWith('//') ||
      decoded.includes('\\') ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) {
      return fallback;
    }

    const resolved = new URL(candidate, CALLBACK_BASE_URL);
    return resolved.origin === CALLBACK_BASE_URL ? candidate : fallback;
  } catch {
    return fallback;
  }
}

export function stripCallbackLocale(path: string, locale: string) {
  const safePath = safeInternalCallbackPath(path);
  if (safePath === `/${locale}`) return '/';
  if (safePath.startsWith(`/${locale}/`)) {
    return safePath.slice(locale.length + 1) || '/';
  }
  return safePath;
}

export function localizeCallbackPath(path: string, locale: string) {
  const unprefixedPath = stripCallbackLocale(path, locale);
  return locale === defaultLocale
    ? unprefixedPath
    : `/${locale}${unprefixedPath}`;
}
