# Legacy Media Migration Runbook

This migration reuses the existing ShipAny R2 storage provider. It does not create a new R2/S3 client and it never deletes local assets or R2 objects.

## Prerequisites

Configure the existing storage settings in ShipAny Settings or the matching environment:

- `r2_access_key`
- `r2_secret_key`
- `r2_bucket_name`
- `r2_upload_path`
- `r2_endpoint`
- `r2_domain=https://pub-76e1325c4f664cfaaa119aa80aa619e0.r2.dev`

The provider must report `r2` as available before any upload command is allowed to proceed.

## Commands

Generate the reviewed manifest from currently referenced Profile media:

```bash
CI=true corepack pnpm@10 media:manifest
```

Check which deterministic objects are missing without writes:

```bash
CI=true corepack pnpm@10 media:migrate -- --env=.env.production --dry-run
```

Upload missing media and verify each public R2 URL. This updates the local manifest only after public URL verification:

```bash
CONFIRM_LEGACY_MEDIA_MIGRATION=1 \
CI=true corepack pnpm@10 media:migrate -- --env=.env.production --upload
```

Patch published Profile JSON only when each manifest URL is verified. The script checks that each Profile field still has the expected old local URL before overwriting it:

```bash
CONFIRM_LEGACY_MEDIA_MIGRATION=1 \
CI=true corepack pnpm@10 media:migrate -- --env=.env.production --apply-db
```

Run a final R2 URL verification:

```bash
CI=true corepack pnpm@10 media:migrate -- --env=.env.production --verify
```

## Rollback and cleanup

- Keep `public/images/legacy` unchanged through a production observation window.
- The manifest records each prior local URL. Restore only affected Profile JSON fields if a database rollback is necessary; do not delete R2 objects during rollback.
- The historic duplicate directories are outside this migration. Perform a separate hash/reference review and receive explicit approval before deleting any files.
