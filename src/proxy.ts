import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/core/i18n/config';
import { envConfigs } from '@/config';
import {
  buildCommunityPermanentRedirectPath,
  resolveCommunityRedirectLookupResponse,
  resolveCommunityVisibilityResponse,
} from '@/shared/services/community/public-visibility';

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle internationalization first
  const intlResponse = intlMiddleware(request);

  // Extract locale from pathname
  const locale = pathname.split('/')[1];
  const isValidLocale = routing.locales.includes(locale as any);
  const pathWithoutLocale =
    (isValidLocale ? pathname.slice(locale.length + 1) : pathname) || '/';
  const localePrefix = isValidLocale ? `/${locale}` : '';
  const sessionCookie = getSessionCookie(request);
  const isPublicContentPage =
    pathWithoutLocale === '/' ||
    pathWithoutLocale.startsWith('/resources') ||
    pathWithoutLocale.startsWith('/collections') ||
    pathWithoutLocale.startsWith('/blog') ||
    pathWithoutLocale.startsWith('/search') ||
    pathWithoutLocale.startsWith('/u/') ||
    pathWithoutLocale === '/privacy-policy' ||
    pathWithoutLocale === '/terms-of-service';

  if (pathWithoutLocale === '/about' && envConfigs.community_about_username) {
    const target = buildCommunityPermanentRedirectPath({
      localePrefix,
      type: 'profile',
      target: envConfigs.community_about_username,
      search: request.nextUrl.search,
    });
    return NextResponse.redirect(new URL(target, request.url), 301);
  }

  const resolveRedirect = async (
    type: 'article' | 'profile',
    value: string
  ) => {
    const secret = process.env.CRON_SECRET;
    // Redirect lookup is an enhancement for legacy slugs. A missing cron
    // secret must not make current public pages unavailable.
    if (!secret) return { status: 200 as const, target: null };
    const resolutionUrl = new URL(
      '/api/internal/community/resolve-redirect',
      request.url
    );
    resolutionUrl.searchParams.set('type', type);
    resolutionUrl.searchParams.set('value', value);
    const response = await fetch(resolutionUrl, {
      headers: { authorization: `Bearer ${secret}` },
      cache: 'no-store',
    }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    return resolveCommunityRedirectLookupResponse({
      ok: Boolean(response?.ok),
      target: result?.target,
    });
  };

  const articleMatch = pathWithoutLocale.match(/^\/blog\/([^/]+)$/);
  if (articleMatch) {
    const visibilityUrl = new URL(
      `/api/community/public/articles/${encodeURIComponent(articleMatch[1])}/visibility`,
      request.url
    );
    const visibilityResponse = await fetch(visibilityUrl, {
      headers: { 'x-community-visibility-check': '1' },
      cache: 'no-store',
    }).catch(() => null);
    const visibility = visibilityResponse
      ? await visibilityResponse.json().catch(() => null)
      : null;
    const visibilityStatus = resolveCommunityVisibilityResponse({
      ok: Boolean(visibilityResponse?.ok),
      status: visibility?.status,
    });
    if (visibilityStatus === 503)
      return new NextResponse('Service Unavailable', {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      });
    if (visibilityStatus === 410)
      return new NextResponse('Gone', { status: 410 });
    if (visibilityStatus === 404) {
      const resolution = await resolveRedirect('article', articleMatch[1]);
      if (resolution.status === 503)
        return new NextResponse('Service Unavailable', {
          status: 503,
          headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
        });
      if (resolution.target) {
        const redirectPath = buildCommunityPermanentRedirectPath({
          localePrefix,
          type: 'article',
          target: resolution.target,
          search: request.nextUrl.search,
        });
        return NextResponse.redirect(new URL(redirectPath, request.url), 301);
      }
    }
  }

  const profileMatch = pathWithoutLocale.match(/^\/u\/([^/]+)$/);
  if (profileMatch) {
    const resolution = await resolveRedirect('profile', profileMatch[1]);
    if (resolution.status === 503)
      return new NextResponse('Service Unavailable', {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      });
    if (resolution.target) {
      const redirectPath = buildCommunityPermanentRedirectPath({
        localePrefix,
        type: 'profile',
        target: resolution.target,
        search: request.nextUrl.search,
      });
      return NextResponse.redirect(new URL(redirectPath, request.url), 301);
    }
  }

  // Only check authentication for admin routes
  if (
    pathWithoutLocale.startsWith('/admin') ||
    pathWithoutLocale.startsWith('/settings') ||
    pathWithoutLocale.startsWith('/activity')
  ) {
    // Check if session cookie exists
    // If no session token found, redirect to sign-in
    if (!sessionCookie) {
      const signInUrl = new URL(
        isValidLocale ? `/${locale}/sign-in` : '/sign-in',
        request.url
      );
      // Add the current path (including search params) as callback - use relative path for multi-language support
      const callbackPath = pathWithoutLocale + request.nextUrl.search;
      signInUrl.searchParams.set('callbackUrl', callbackPath);
      return NextResponse.redirect(signInUrl);
    }

    // For admin routes, we need to check RBAC permissions
    // Note: Full permission check happens in the page/API route level
    // This is a lightweight session check to prevent unauthorized access
    // The detailed permission check (admin.access and specific permissions)
    // will be done in the layout or individual pages using requirePermission()
  }

  intlResponse.headers.set('x-pathname', request.nextUrl.pathname);
  intlResponse.headers.set('x-url', request.url);

  const overriddenRequestHeaders = new Set(
    (intlResponse.headers.get('x-middleware-override-headers') || '')
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean)
  );
  overriddenRequestHeaders.add('x-pathname');
  overriddenRequestHeaders.add('x-session-present');
  intlResponse.headers.set(
    'x-middleware-override-headers',
    [...overriddenRequestHeaders].join(',')
  );
  intlResponse.headers.set(
    'x-middleware-request-x-pathname',
    request.nextUrl.pathname
  );
  intlResponse.headers.set(
    'x-middleware-request-x-session-present',
    sessionCookie ? '1' : '0'
  );

  // Give authenticated public-page requests a distinct internal cache key.
  // The browser URL remains unchanged, while anonymous HTML can be cached
  // without ever serving that shell to a signed-in request.
  if (isPublicContentPage && sessionCookie) {
    const existingRewrite = intlResponse.headers.get('x-middleware-rewrite');
    const workspaceUrl = existingRewrite
      ? new URL(existingRewrite)
      : request.nextUrl.clone();
    workspaceUrl.searchParams.set('__workspace', '1');
    intlResponse.headers.set('x-middleware-rewrite', workspaceUrl.toString());
  }

  // Only anonymous public content may enter shared cache. Session responses
  // always remain private because their surrounding product shell is personal.
  if (isPublicContentPage && !sessionCookie) {
    intlResponse.headers.delete('Set-Cookie');
    const cacheControl = 'public, s-maxage=300, stale-while-revalidate=1800';

    intlResponse.headers.set('Cache-Control', cacheControl);
    intlResponse.headers.set('CDN-Cache-Control', cacheControl);
    intlResponse.headers.set('Cloudflare-CDN-Cache-Control', cacheControl);
  } else if (
    !pathWithoutLocale.startsWith('/sign-') &&
    !pathWithoutLocale.startsWith('/auth')
  ) {
    intlResponse.headers.set('Cache-Control', 'private, no-store');
    intlResponse.headers.set('CDN-Cache-Control', 'no-store');
    intlResponse.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  }

  // For all other routes (including /, /sign-in, /sign-up, /sign-out), just return the intl response
  return intlResponse;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
