# Deployment Environment Checklist

This project reuses ShipAny's existing better-auth, database, storage, and chat configuration. Configure these values in Vercel Preview and Production independently. Do not commit secret values.

## Application and Database

- `NEXT_PUBLIC_WEB_URL`: canonical deployed URL for the matching environment.
- Database provider and Neon PostgreSQL connection variables already used by `src/core/db/config.ts`.
- Run `CI=true corepack pnpm@10 db:migrate` against the intended Neon branch before deploying new schema.
- Initialize platform data with `seed:platform -- --env=<environment-file> --dry-run`, then use `CONFIRM_PLATFORM_SEED=1` with `--apply` after reviewing counts.

## Authentication

- Existing better-auth secret and base URL variables.
- `REFERRAL_COOKIE_SECRET`: a separate high-entropy HMAC secret for the 30-day first-click referral cookie. If omitted, the server falls back to `AUTH_SECRET`; configure a separate value in Preview and Production before launch.
- Google OAuth client ID and client secret.
- Google authorized redirect URL must match the environment's existing better-auth callback route.
- Initialize RBAC and manually grant administrator roles with the existing `rbac:init` and `rbac:assign` commands. The resource platform does not add a parallel role system.

## Storage

- Existing Cloudflare R2 endpoint, bucket, access key, secret key, upload path, and public URL variables used by the current storage adapter: `r2_access_key`, `r2_secret_key`, `r2_bucket_name`, `r2_upload_path`, `r2_endpoint`, and `r2_domain`.
- The currently approved public migration domain is `https://pub-76e1325c4f664cfaaa119aa80aa619e0.r2.dev`. Configure it as the existing `r2_domain`; do not add a separate media client or URL builder.
- Verify resource icon/screenshot uploads in the target environment after deployment.

## AI and Assistant

- Store all AI secrets in the local environment file for the matching environment and in Vercel Project Settings > Environment Variables. Never prefix server secrets with `NEXT_PUBLIC_` and never commit real values.
- `HONOURSOFT_API_KEY` and `HONOURSOFT_API_BASE_URL=https://cc.honoursoft.cn/v1` are the server-side Claude Provider settings. The router uses the Anthropic Messages protocol and sends the key with the `x-api-key` header.
- `DEEPSEEK_API_KEY` and `DEEPSEEK_API_BASE_URL=https://api.deepseek.com/v1` are the server-side DeepSeek Provider settings. The router uses the OpenAI-compatible Chat Completions protocol and sends the key as a bearer token.
- The seeded model catalog references both API keys by environment-variable name. Provider URLs and secrets stay server-side; the frontend only receives public model names and capabilities.
- Changing either Provider base URL after initialization does not rewrite the Provider row automatically. Update it in `/admin/ai-models` or rerun the idempotent assistant seed for that environment.
- Optional `AI_FALLBACK_PROVIDER_API_KEY` and `AI_FALLBACK_PROVIDER_BASE_URL` for the separately confirmed fallback channel. The seeded fallback Provider is inactive until an administrator verifies and enables it.
- Extended thinking is configured per model in `/admin/ai-models`: enable the capability only after verifying the Provider model supports reasoning, then select `low`, `medium`, or `high`. `AI_REASONING_ENABLED=false` is an optional emergency kill switch for every model; omit it or set it to `true` during normal operation.
- Configure `TAVILY_API_KEY` for user-enabled web search. Save `ai_web_search_credit_cost_usd=0.008`, choose `ai_web_search_depth=basic` or `advanced`, and optionally set `ai_web_search_api_key_env=TAVILY_API_KEY` plus `ai_web_search_url=https://api.tavily.com/search`. Basic uses 1 Tavily Credit; advanced uses 2. The public toggle remains disabled when either the key or provider-Credit price is missing.
- After changing any AI environment variable in Vercel, redeploy the affected Preview or Production environment. Environment changes do not update an already-running deployment.
- Review the catalog with `pnpm seed:ai-assistant -- --env=<environment-file>`; write it with `CONFIRM_AI_ASSISTANT_SEED=1 pnpm seed:ai-assistant -- --env=<environment-file> --apply`.
- Apply migration `0010`, then configure the sandbox and production Creem Product ID for each fixed Credit package in `/admin/credits`. The server rejects checkout until the Product ID for the active `creem_environment` is present; amounts and Credit quantities cannot be overridden by the client.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for multi-instance assistant rate limiting. Rotate the token before entering it in Vercel if it was shared outside the secret manager.
- `AI_RATE_LIMIT_PER_MINUTE` and `AI_MAX_CONCURRENT_REQUESTS` control per-user request frequency and database-backed concurrent generation leases. Defaults are `12` and `2`.
- `AI_IMAGE_INPUT_TOKENS` is the conservative per-image estimation value used before provider capability and billing are verified. The default is `1200`; reconcile it against real provider usage before enabling vision.
- Without Upstash variables, the assistant falls back to the existing single-instance in-memory fixed window limiter; this is suitable only for local development or low-volume Preview checks.

## Data Retention Cleanup

- Configure a high-entropy `CRON_SECRET` in Vercel Production. Vercel sends it as `Authorization: Bearer <CRON_SECRET>` to the scheduled cleanup route.
- `vercel.json` invokes `/api/cron/purge-deleted-content` daily at 03:17 UTC. Verify the cron appears in the Production deployment after release.
- The worker permanently deletes projects and standalone chats whose 30-day `purgeAt` deadline has passed, including private R2 objects, parsed chunks, and other cascade-owned content.
- The same daily worker deletes email-password accounts that remain unverified for more than 7 days. Accounts linked to Google, GitHub, or another Provider are retained.
- Vercel Hobby invokes `/api/cron/refund-expired-reservations` daily at 03:47 UTC as a fallback and refunds up to 1,000 expired AI Credit reservations in batches.
- `/api/cron/process-referral-rewards` is implemented but not scheduled in `vercel.json`. Configure an approved external scheduler or supported Vercel Cron plan before enabling referral reward processing, then verify duplicate invocations do not create duplicate rewards or Credit grants.
- If Production requires ten-minute refund recovery, configure an external scheduler to call `GET /api/cron/refund-expired-reservations` with `Authorization: Bearer <CRON_SECRET>`. Vercel Hobby does not support cron intervals shorter than one day.
- R2 failures remain in `ai_file` as `cleanup_failed` with the error in `parse_error`; the next daily run retries them. Do not manually remove these rows before the object cleanup succeeds.
- Credit reservations, usage ledgers, payment risk events, transactions, orders, and other financial or anti-fraud records are not deleted by this worker.
- After deployment, call the route once with the Production cron bearer secret and confirm it returns HTTP 200. A missing or incorrect secret must return HTTP 401.
- Before applying migration `0002`, confirm there are no duplicate non-null `(transaction_id, payment_provider)` order pairs. The migration deliberately aborts instead of deleting or merging financial records.

## Community Blog Email Operations

- Configure the existing `resend_api_key` and `resend_sender_email` settings independently in Preview and Production. Do not create a second email Provider or commit the API key.
- `CRON_SECRET` also protects `/api/cron/remind-pending-comments`, `/api/cron/close-unhandled-comments`, and the community translation, moderation, and email workers.
- Community reminder, closure, translation, moderation, and email worker routes are implemented but not scheduled in `vercel.json`. Configure an approved external scheduler or supported Vercel Cron plan with the same bearer secret before enabling these workflows.
- Translation and moderation requests only persist source content and `community_job` events. Verify the scheduled workers drain due jobs, recover expired leases, fail exhausted work without blocking later jobs, and leave failed moderation in an administrator-reviewable state.
- The reminder Cron only queues and processes persisted `community_job` events. Article review transactions also persist email jobs before returning; no formal workflow depends on a long HTTP request.
- Verify a duplicate reminder Cron and a duplicate article review event produce one `community_email_delivery` idempotency record and no duplicate Resend delivery.
- Verify every retry sends the same stable Resend idempotency key. Community email delivery is at-least-once across the database and external API boundary; duplicate suppression depends on the configured Provider honoring that key, not on database exactly-once semantics.
- Verify only email-verified users with the matching preference enabled are sent community email. Disabled or unverified recipients must be recorded as skipped.
- Verify Chinese and English HTML and plain-text templates for pending comments, article approval, changes requested, and rejection. User-facing mail must not contain internal moderation notes, model names, Provider routing, or API keys.
- Verify the signed unsubscribe endpoint disables only the requested preference and rejects a modified token. Product marketing unsubscribe must remain independent from transactional and task email preferences.
- Administrators can inspect delivery status, provider message ID, attempt count, and error at `/admin/community/emails`; failed deliveries can be reset to the persistent retry queue.
- Do not send real email during migration or automated tests. Validate Resend Preview first, then Production with an approved verified address.
- Before Production launch, manually complete the European and US marketing consent, privacy, and unsubscribe compliance review. The current product default for marketing email is not a legal conclusion and must change if applicable law requires opt-in.
- Calibrate and approve translation, moderation, and email operating budgets before enabling the production workers.

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
