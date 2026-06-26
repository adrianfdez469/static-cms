# Static CMS

A lightweight, file-based CMS built with **Next.js (App Router)** that stores all
content in **Supabase Storage**. Pages are authored as Markdown, wrapped in a
single customizable HTML template, rendered on the server, and cached
indefinitely until content changes. It ships with a password-protected admin
panel and an AI assistant (Anthropic Claude) for styling the template.

**Live demo:** https://static-cms-umber.vercel.app

---

## Why this stack? (design rationale)

This project needed a CMS where content can be **created and edited at runtime**
(via an admin panel), served as HTML with good performance, and deployed without
friction. The choices below follow from that constraint.

### Next.js

Next.js was the natural fit because it unifies frontend and backend in a single
application while supporting **SSR**, dynamic routing, and a powerful **caching
layer**.

Public content URLs are served by a **required** catch-all route handler
(`[...slug]/route.js`) that maps each path to storage. The home page (`/`) is a
separate React page (`page.js`) that lists available routes. On the first request
to a content page, the server fetches Markdown and the HTML template from
storage, renders the page, and **caches the result indefinitely** via
`unstable_cache`. Subsequent requests are served from that cache without hitting
Supabase again.

When content or the template changes through the admin panel, the app
**invalidates the relevant cache tags and paths** (`revalidateTag` /
`revalidatePath`), so the next visit rebuilds the page from storage. In
development, caching is bypassed so changes are always visible immediately.

### Vercel

Vercel is the platform Next.js is built for and the one recommended in its
documentation. Deployment is a git push away: connect the repository, set
environment variables, and the app is live. That simplicity matters for a small,
self-contained CMS.

### Supabase Storage (instead of the repo filesystem)

The hardest decision was where to store Markdown files and `template.html`.

A local `content/**/*.md` layout works well in development (`fs` is enough), but
**not in production on Vercel**:

- The app is built and deployed as a read-only artifact; the filesystem is not a
  durable place to write user uploads.
- Static assets and pre-rendered pages are served from the CDN. To publish new
  content you would need to commit files to Git and **trigger a full redeploy**
  — slow, awkward, and would require tooling to commit from the app itself.
- The same problem applies to `template.html`: every layout change would imply
  another deploy cycle.

Alternatives like **Google Cloud Storage** or **AWS S3** were considered.
**Supabase Storage** was chosen for a practical reason: a **generous free tier**,
a simple JavaScript SDK, and enough features for bucket CRUD without extra
infrastructure.

Object storage also matches the mental model of a file-based CMS
(`content/<slug>/index.md` + one global template) without the overhead of a
relational database or a third-party headless CMS.

### Trade-off: caching vs. live updates

Aggressive caching improves response times, but the CDN/cache layer has no way to
know when a file changes in Supabase on its own.

Because **the admin panel lives in the same application**, every create, update,
or delete triggers targeted revalidation. That keeps pages fast *and* up to date
without redeploying. The main caveat remains: changes made **directly in the
Supabase dashboard** (bypassing the admin) will not invalidate the cache until
the next admin write. See [Future improvements](#future-improvements) for
planned mitigations.

---

## Features

- **File-based content** — each page is a Markdown file stored at
  `content/<slug>/index.md` inside the `CMS` Supabase Storage bucket.
- **Single HTML template** — `template.html` (with one `{{content}}` placeholder)
  wraps every rendered page. Markdown is converted to HTML with `marked`.
- **Dynamic routing** — a catch-all route handler (`[...slug]/route.js`) serves
  any content page from storage as raw HTML. The home page (`page.js`) is a
  React index that lists all published routes by traversing the storage tree.
- **Aggressive caching + on-demand revalidation** — pages are cached with
  `unstable_cache` (`revalidate: false`) and invalidated via tags whenever
  content or the template changes. Caching is bypassed automatically in
  development.
- **Admin panel** (`/admin`) — protected by a signed-cookie session. Lets you:
  - Browse the content tree.
  - Create, edit, upload, and delete Markdown pages.
  - Edit the global `template.html`.
  - Initialize the bucket (creates the `content/` folder and a default template).
  - Preview pages in a new tab.
- **AI template styling** — when editing `template.html`, an Anthropic Claude
  assistant can rewrite the HTML/CSS via streaming. Output is validated
  (exactly one `{{content}}`, no `<script>`/inline handlers/`iframe`, https-only
  external links) before being applied.
- **Security guards** — path traversal protection, 5MB file-size limit,
  extension allow-listing (`.md` in `content/`, `.html` for the template), and
  slug validation (lowercase letters, numbers, hyphens).

### Tech stack

| Area        | Choice                                  |
| ----------- | --------------------------------------- |
| Framework   | Next.js 16 (App Router) + React 19      |
| Storage     | Supabase Storage                        |
| Markdown    | `marked`                                |
| AI          | `@anthropic-ai/sdk` (Claude)            |
| Styling     | Tailwind CSS 4                          |
| Testing     | Vitest                                  |

---

## Running locally

### Prerequisites

- Node.js 18.18+ (Node 20+ recommended for Next.js 16).
- A Supabase project (free tier is enough).
- An Anthropic API key (only required for the AI template styling feature).

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase Storage

The app reads and writes content to a Supabase Storage bucket named `CMS`.

1. Create (or open) a project at [supabase.com](https://supabase.com).
2. Go to **Storage** → **Create a new bucket**:
   - **Name:** `CMS` (must match exactly — see `src/lib/cmsConstants.js`).
   - **Public bucket:** recommended **ON** if you want the "Preview" links and
     direct asset access to work without signed URLs. The bucket name is
     case-sensitive.
3. Add a **Storage RLS policy** so the anon key can read objects. Public page
   rendering (`download`) and the home route list (`list`) both use
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, not the service role. Without a `SELECT`
   policy on `storage.objects`, folder listing fails and the home page shows no
   routes even when content exists.

   In **SQL Editor**, run:

   ```sql
   CREATE POLICY "Public read CMS bucket"
   ON storage.objects
   FOR SELECT
   TO public
   USING (bucket_id = 'CMS');
   ```

   All writes still go through the service role key in server actions, so this
   policy only grants read access to the `CMS` bucket.
4. Grab your keys from **Project Settings** → **API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
     (server-only, **never** expose this in client code)

> You don't need to create folders manually. Once the app is running, log into
> `/admin` and click **Initialize CMS** to create the `content/` folder and a
> default `template.html`.

### 3. Set environment variables

Copy the example file and fill it in:

```bash
cp .env.local.example .env.local
```

```bash
# Supabase (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, keep secret

# Admin panel credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
ADMIN_SESSION_SECRET=long-random-secret   # used to sign session cookies

# Anthropic (only needed for AI template styling)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # optional, this is the default
```

See [Environment variables](#environment-variables) below for where each value
comes from.

### 4. Start the dev server

```bash
npm run dev
```

- Public site: http://localhost:3000
- Admin panel: http://localhost:3000/admin (log in, then **Initialize CMS**)

Create your first page in the admin panel, save it, and visit its route.

---

## Environment variables

| Variable                        | Required | Where to get it / notes                                                                 |
| ------------------------------- | :------: | --------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      |   Yes    | Supabase → Project Settings → API → **Project URL**.                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` |   Yes    | Supabase → Project Settings → API → **anon public** key. Used for public reads.         |
| `SUPABASE_SERVICE_ROLE_KEY`     |   Yes    | Supabase → Project Settings → API → **service_role** key. Server-only; powers writes.   |
| `ADMIN_USERNAME`                |   Yes    | Username for the admin panel login (you pick it).                                        |
| `ADMIN_PASSWORD`                |   Yes    | Password for the admin panel login (you pick it).                                        |
| `ADMIN_SESSION_SECRET`          |   Yes    | Long random string used to HMAC-sign the admin session cookie.                          |
| `ANTHROPIC_API_KEY`             | Optional | [console.anthropic.com](https://console.anthropic.com) → API Keys. Needed for AI styling.|
| `ANTHROPIC_MODEL`               | Optional | Defaults to `claude-sonnet-4-20250514` if unset.                                         |

Tips for generating secrets:

```bash
# Generate a strong random secret for ADMIN_SESSION_SECRET
openssl rand -hex 32
```

> All `.env*` files are gitignored (except `.env.local.example`). Never commit
> real keys. The `service_role` key bypasses Row Level Security — treat it like a
> root password and only use it server-side.

---

## How it works / iterating on the project

### Project structure

```
src/
├── app/
│   ├── page.js                     # Home page — lists available content routes
│   ├── loading.js                  # Root loading UI
│   ├── [...slug]/route.js          # Public catch-all renderer (Markdown → HTML)
│   ├── admin/                      # Admin panel (page, layout, login, server actions)
│   │   └── actions.js              # Server Actions for file CRUD + auth
│   ├── api/
│   │   └── admin/template-ai/      # SSE endpoint streaming Claude responses
│   └── layout.js / layout.css / not-found.js
├── components/admin/               # Admin UI (file tree, editor, AI chat, etc.)
├── lib/
│   ├── cmsConstants.js             # Bucket name, paths, default template, limits
│   ├── contentBuilder.js          # Reads storage, renders pages, lists routes, caching
│   ├── storageAdmin.js            # Privileged storage ops (service role key)
│   ├── supabase.js / supabaseAdmin.js  # Supabase clients (anon vs service role)
│   ├── auth.js / authSession.js    # Cookie session + HMAC token verification
│   ├── revalidateCms.js            # Tag/path revalidation on content changes
│   └── templateAi/                 # Prompt, tool schema, streaming, validation
└── middleware.js                   # Protects /admin and /api/admin routes
```

### Routing

| URL pattern | Handler | Output |
| ----------- | ------- | ------ |
| `/` | `page.js` (React) | Home index with a list of published routes |
| `/<slug>/…` | `[...slug]/route.js` (Route Handler) | Rendered HTML from Markdown + `template.html` |

Content pages are returned as raw HTML from a Route Handler (not a React page
component), which keeps the rendered output identical to what `template.html`
defines. The home page is a regular React page that calls `listContentRoutes()`
to discover pages in storage.

### Common iteration tasks

- **Add a new page:** use the admin panel, or upload an `index.md` under
  `content/<slug>/` in the bucket. Routes are derived from folder structure.
- **Change global layout/design:** edit `template.html` (keep exactly one
  `{{content}}` placeholder) via the admin editor — optionally using the AI
  assistant.
- **Change the bucket name or paths:** edit `src/lib/cmsConstants.js`.
- **Adjust caching/revalidation:** see `contentBuilder.js` (cache tags) and
  `revalidateCms.js` (what gets invalidated on each change).
- **Tune the AI assistant:** edit the system prompt in
  `src/lib/templateAi/prompt.js`, the tool schema in `tools.js`, or the
  validation rules in `validateTemplate.js`.

### Scripts

```bash
npm run dev         # Start the dev server (caching is bypassed in dev)
npm run build       # Production build
npm run start       # Start the production server
npm run lint        # Run ESLint
npm run test        # Run the test suite (Vitest)
npm run test:watch  # Run tests in watch mode
```

---

## Deployment (Vercel)

This project is deployed on Vercel: https://static-cms-umber.vercel.app

1. Push the repository to GitHub/GitLab/Bitbucket and import it into Vercel.
2. Add **all** environment variables from the table above in
   **Project → Settings → Environment Variables**.
3. Deploy. After the first deploy, open `/admin`, log in, and **Initialize CMS**
   if you're using a fresh bucket.

---

## Notes & caveats

- **Bucket name is case-sensitive** and hardcoded to `CMS` in
  `src/lib/cmsConstants.js`.
- **In development, caching is disabled** so you always see fresh content; in
  production, content is cached until a write triggers revalidation.
- The admin session is a stateless, HMAC-signed cookie that expires after 24h.
- The AI assistant is intentionally scoped to template styling only and will
  refuse off-topic requests; generated HTML is validated before being applied.

---

## Future improvements

- **Home page route listing** — The home page (`page.js`) calls
  `listContentRoutes()` in `contentBuilder.js`, which walks the entire
  `content/` tree in Supabase Storage (one `list()` request per folder, BFS).
  With many pages or deep nesting, this becomes slow and the client-side fetch
  blocks the index from rendering. Improvements to consider:
  - Cap the number of routes returned (e.g. first N alphabetically) and show a
    "and X more" message with a link to the admin tree.
  - Limit traversal depth or paginate the list on the home page.
  - Cache the route list server-side (e.g. `unstable_cache` with a `cms:routes`
    tag invalidated on content changes) and render the index on the server
    instead of fetching from the client.
  - Maintain a lightweight route manifest file in storage (updated on each
    admin write) to avoid full-tree scans.
- **Route warmup** — The first request to each page still fetches Markdown and
  the template from Supabase and renders HTML on the server. A warmup step could
  list all routes in storage and request each one proactively (after deploy, on a
  schedule, or after bulk content changes) so pages are **pre-cached** before
  real visitors hit them.
- **Storage change notifications** — Revalidation today only runs automatically
  when writes go through `/admin`. Edits made directly in the Supabase dashboard
  leave stale cached pages until the next admin write.
  A future enhancement would wire up a **Supabase Storage webhook or
  subscription** (e.g. a Database Webhook on `storage.objects`, an Edge
  Function, or Realtime) that notifies the app when files are created, updated,
  or deleted and triggers the same tag/path revalidation used by the admin
  panel.
