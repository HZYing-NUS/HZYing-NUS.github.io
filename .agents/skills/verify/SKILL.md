---
name: verify
description: Run the WebTools Next.js app and observe public content-platform flows.
---

Use `.Codex/launch.json` configuration `webtools-dev` to start the app on port 3000.

Drive these routes in the browser:

- `/en/resources` and a resource detail route
- `/en/collections` and a collection detail route
- `/en/about`
- `/en/submit`
- `/en/assistant`

For authenticated submit and assistant model responses, use an environment whose `NEXT_PUBLIC_WEB_URL` and OAuth callback configuration match the local host, or verify in a deployed Preview. Local `.env.production` can redirect the browser to the deployed domain.
