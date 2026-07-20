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
  const pathWithoutLocale = isValidLocale
    ? pathname.slice(locale.length + 1)
    : pathname;
  const localePrefix = isValidLocale ? `/${locale}` : '';

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
    if (!secret) return { status: 503 as const, target: null };
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
    const sessionCookie = getSessionCookie(request);

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

  // Remove Set-Cookie from public pages to allow caching
  // We exclude admin, settings, activity, and auth pages from this behavior
  if (
    !pathWithoutLocale.startsWith('/admin') &&
    !pathWithoutLocale.startsWith('/settings') &&
    !pathWithoutLocale.startsWith('/activity') &&
    !pathWithoutLocale.startsWith('/sign-') &&
    !pathWithoutLocale.startsWith('/auth')
  ) {
    intlResponse.headers.delete('Set-Cookie');

    // Cache-Control header for public pages
    const cacheControl = 'public, s-maxage=3600, stale-while-revalidate=14400';

    intlResponse.headers.set('Cache-Control', cacheControl);
    intlResponse.headers.set('CDN-Cache-Control', cacheControl);
    intlResponse.headers.set('Cloudflare-CDN-Cache-Control', cacheControl);
  }

  // For all other routes (including /, /sign-in, /sign-up, /sign-out), just return the intl response
  return intlResponse;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
