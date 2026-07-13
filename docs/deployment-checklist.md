# Deployment Environment Checklist

This project reuses ShipAny's existing better-auth, database, storage, and chat configuration. Configure these values in Vercel Preview and Production independently. Do not commit secret values.

## Application and Database

- `NEXT_PUBLIC_WEB_URL`: canonical deployed URL for the matching environment.
- Database provider and Neon PostgreSQL connection variables already used by `src/core/db/config.ts`.
- Run `CI=true corepack pnpm@10 db:migrate` against the intended Neon branch before deploying new schema.
- Initialize platform data with `seed:platform -- --env=<environment-file> --dry-run`, then use `CONFIRM_PLATFORM_SEED=1` with `--apply` after reviewing counts.

## Authentication

- Existing better-auth secret and base URL variables.
- Google OAuth client ID and client secret.
- Google authorized redirect URL must match the environment's existing better-auth callback route.
- Initialize RBAC and manually grant administrator roles with the existing `rbac:init` and `rbac:assign` commands. The resource platform does not add a parallel role system.

## Storage

- Existing Cloudflare R2 endpoint, bucket, access key, secret key, upload path, and public URL variables used by the current storage adapter: `r2_access_key`, `r2_secret_key`, `r2_bucket_name`, `r2_upload_path`, `r2_endpoint`, and `r2_domain`.
- The currently approved public migration domain is `https://pub-76e1325c4f664cfaaa119aa80aa619e0.r2.dev`. Configure it as the existing `r2_domain`; do not add a separate media client or URL builder.
- Verify resource icon/screenshot uploads in the target environment after deployment.

## AI and Assistant

- Existing OpenRouter/AI provider configuration used by `src/app/api/resource-assistant/route.ts`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for multi-instance assistant rate limiting. Rotate the token before entering it in Vercel if it was shared outside the secret manager.
- Without Upstash variables, the assistant falls back to the existing single-instance in-memory fixed window limiter; this is suitable only for local development or low-volume Preview checks.

## Content Migration

- Seed Profile: `CONFIRM_LEGACY_PROFILE_SEED=1 pnpm seed:legacy-profile -- --env=<environment-file> --apply`
- Seed legacy posts under an existing administrator account: `CONFIRM_LEGACY_POSTS_SEED=1 pnpm seed:legacy-posts -- --env=<environment-file> --author-email=<existing-admin-email> --apply`
- All seed scripts are insert-only. Re-running them preserves editor-managed rows and reports skipped counts.

## Post-deploy Acceptance

1. Google sign-in succeeds and ordinary users can submit suggestions.
2. Existing RBAC administrators can manage resources, collections, submissions, and Profile content.
3. R2 upload returns a public URL and the image renders on public pages.
4. Published content appears in resource/collection/search/sitemap; drafts do not.
5. The resource assistant returns source links and responds with 429 after the configured fixed-window limit.
